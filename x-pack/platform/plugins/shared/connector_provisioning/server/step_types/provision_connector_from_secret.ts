/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { getConnectorSpec } from '@kbn/connector-specs';
import { AUTH_TYPE_DISCRIMINATOR } from '@kbn/connector-specs/src/lib/get_schema_for_auth_type';
import { provisionConnectorFromSecretCommonDefinition } from '../../common/step_types/provision_connector_from_secret';
import type { ConnectorProvisioningStartDeps } from '../types';
import { ProvisioningInputError, classifyFields, resolveAuthType } from './field_classification';
import {
  collectUniquePaths,
  mergeFieldSources,
  resolveFieldSources,
  validateExplicitOverrideTargetFields,
} from './field_source_resolution';
import { readVaultPaths } from './read_vault_paths';
import { upsertConnector } from './upsert_connector';

/**
 * The `provisioning.provisionConnectorFromSecret` Workflow step: reads Vault-sourced
 * fields via another connector's `readSecret` action and uses them to create/upsert a
 * target Kibana connector, without ever returning the resolved values as step output.
 *
 * This step's `handler` is the intended, statically-checked *direct caller* of the
 * actions plugin's `getSensitiveOutputAccessToken()` -- see the connector-provisioning
 * plan \u00a75.2/\u00a75.3 for the precise, non-structural framing of that guarantee.
 */
export const provisionConnectorFromSecretStepDefinition = (
  coreSetup: CoreSetup<ConnectorProvisioningStartDeps>
) =>
  createServerStepDefinition({
    ...provisionConnectorFromSecretCommonDefinition,
    handler: async (context) => {
      const [, { actions }] = await coreSetup.getStartServices();
      const {
        vaultConnectorId,
        targetConnectorTypeId,
        targetConnectorName,
        authType: requestedAuthType,
        targetConnectorConfig,
        targetConnectorSecrets,
        fieldBindings,
        mode,
        targetConnectorId,
      } = context.input;

      // Scope guard (\u00a75.3): only connector types registered via @kbn/connector-specs
      // are supported as provisioning targets.
      const spec = getConnectorSpec(targetConnectorTypeId);
      if (!spec) {
        throw new ProvisioningInputError(
          `Target connector type '${targetConnectorTypeId}' is not a spec-based connector ` +
            `type; provisioning only supports connector types registered via @kbn/connector-specs.`
        );
      }

      if (mode === 'upsert' && !targetConnectorId) {
        throw new ProvisioningInputError(`mode 'upsert' requires targetConnectorId.`);
      }

      const authType = resolveAuthType(spec, targetConnectorTypeId, requestedAuthType);
      const classification = classifyFields(spec, targetConnectorTypeId, authType);
      const { configFieldNames, secretFieldNames } = classification;

      // Pre-Vault-call validation: every explicit override's targetField must be a
      // recognized *secrets* field of the target connector type (Vault-sourced values
      // may never populate a cleartext config field).
      validateExplicitOverrideTargetFields(fieldBindings, classification, targetConnectorTypeId);

      const fakeRequest = context.contextManager.getFakeRequest();
      const actionsClient = await actions.getActionsClientWithRequest(fakeRequest);

      const paths = collectUniquePaths(fieldBindings);
      const valuesByPath = await readVaultPaths({
        actionsClient,
        vaultConnectorId,
        paths,
        allowSensitiveOutput: actions.getSensitiveOutputAccessToken(),
        targetConnectorName,
      });

      // Field-source collision check (\u00a75.3): fails fast, before any config/secrets
      // merge or connector write.
      const resolvedSourceByTargetField = resolveFieldSources({
        targetConnectorConfig,
        targetConnectorSecrets,
        fieldBindings,
        valuesByPath,
        secretFieldNames: new Set(secretFieldNames),
      });

      const { config, secrets } = mergeFieldSources({
        resolvedSourceByTargetField,
        configFieldNames,
        targetConnectorConfig,
        targetConnectorSecrets,
        valuesByPath,
      });

      // `classifyFields` deliberately excludes the `authType` discriminator from
      // `secretFieldNames` (auto-match/override must never target it directly), but the
      // target connector type's generated secrets schema is a `z.discriminatedUnion`
      // keyed on `authType` -- so it must still be present in the payload sent to
      // actionsClient.create()/update(), or every secrets-schema validation will fail.
      if (authType !== undefined) {
        secrets[AUTH_TYPE_DISCRIMINATOR] = authType;
      }

      const result = await upsertConnector({
        actionsClient,
        mode,
        targetConnectorId,
        targetConnectorTypeId,
        targetConnectorName,
        config,
        secrets,
      });

      return { output: result };
    },
  });
