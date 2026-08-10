/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthTypeDef, ConnectorSpec } from '@kbn/connector-specs';
import {
  AUTH_TYPE_DISCRIMINATOR,
  getSchemaForAuthType,
} from '@kbn/connector-specs/src/lib/get_schema_for_auth_type';

/** A user-facing, value-free error. Every message here is built only from spec-derived names/ids. */
export class ProvisioningInputError extends Error {}

const getAuthTypeId = (authTypeDef: string | AuthTypeDef): string =>
  typeof authTypeDef === 'string' ? authTypeDef : authTypeDef.type;

export interface FieldClassification {
  configFieldNames: string[];
  secretFieldNames: string[];
  /** Union of configFieldNames and secretFieldNames, for auto-match/override validation. */
  allFieldNames: Set<string>;
}

/**
 * Resolves `authType` against a target connector spec's `auth.types`, per the exact
 * default/required/error contract in the connector-provisioning plan (\u00a75.3):
 * - zero auth types: `authType` must be omitted.
 * - exactly one: `authType` is optional and defaults to that entry's id.
 * - multiple: `authType` is required and must be one of the spec's ids.
 * Also validates a caller-provided `authType` that doesn't match any of the spec's ids,
 * even in the single-auth-type case.
 */
export function resolveAuthType(
  spec: ConnectorSpec,
  targetConnectorTypeId: string,
  requestedAuthType: string | undefined
): string | undefined {
  const authTypeDefs = spec.auth?.types ?? [];
  const authTypeIds = authTypeDefs.map(getAuthTypeId);

  if (authTypeIds.length === 0) {
    if (requestedAuthType !== undefined) {
      throw new ProvisioningInputError(
        `Target connector type '${targetConnectorTypeId}' has no authentication types; omit authType.`
      );
    }
    return undefined;
  }

  if (requestedAuthType === undefined) {
    if (authTypeIds.length === 1) {
      return authTypeIds[0];
    }
    throw new ProvisioningInputError(
      `Target connector type '${targetConnectorTypeId}' has multiple authentication types (${authTypeIds.join(
        ', '
      )}); authType is required.`
    );
  }

  if (!authTypeIds.includes(requestedAuthType)) {
    throw new ProvisioningInputError(
      `Target connector type '${targetConnectorTypeId}' has authentication type(s) (${authTypeIds.join(
        ', '
      )}); authType '${requestedAuthType}' is not valid.`
    );
  }

  return requestedAuthType;
}

/**
 * Builds the structural config/secrets field-name classification for a target connector
 * spec and resolved `authType`, and enforces the ambiguous-name guard (\u00a72 guarantee 3):
 * a name claimed by both the config schema and the secrets schema is an internal
 * inconsistency in the target spec that this step refuses to silently resolve.
 *
 * This proves only that structurally-declared config/secrets field names don't collide
 * -- it cannot verify that the target spec's authors classified any given field
 * correctly in the first place.
 */
export function classifyFields(
  spec: ConnectorSpec,
  targetConnectorTypeId: string,
  authType: string | undefined
): FieldClassification {
  const configFieldNames = Object.keys(spec.schema?.shape ?? {});

  let secretFieldNames: string[] = [];
  if (authType !== undefined) {
    const matchingAuthTypeDef = (spec.auth?.types ?? []).find(
      (def) => getAuthTypeId(def) === authType
    );
    if (!matchingAuthTypeDef) {
      // Unreachable: resolveAuthType() already validated `authType` against this same list.
      throw new ProvisioningInputError(
        `Target connector type '${targetConnectorTypeId}' has no authentication type '${authType}'.`
      );
    }
    const { schema } = getSchemaForAuthType(matchingAuthTypeDef);
    secretFieldNames = Object.keys(schema.shape).filter((name) => name !== AUTH_TYPE_DISCRIMINATOR);
  }

  const overlap = configFieldNames.filter((name) => secretFieldNames.includes(name));
  if (overlap.length > 0) {
    throw new ProvisioningInputError(
      `Target connector type '${targetConnectorTypeId}' has an internal field-classification ` +
        `conflict: ${overlap.join(', ')} appear in both its config and secrets schemas. This is ` +
        `an inconsistency in that connector type's own spec, not something this step can safely resolve.`
    );
  }

  return {
    configFieldNames,
    secretFieldNames,
    allFieldNames: new Set([...configFieldNames, ...secretFieldNames]),
  };
}
