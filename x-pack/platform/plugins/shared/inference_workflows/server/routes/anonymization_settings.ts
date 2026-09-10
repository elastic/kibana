/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaRequest } from '@kbn/core/server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  INFERENCE_PII_ANONYMIZATION_DEFAULTS,
  INFERENCE_PII_ANONYMIZATION_WORKFLOW_ID,
  type InferencePiiAnonymizationTemplateValues,
  type InferencePiiBuiltInRule,
  type InferencePiiCustomRule,
} from '@kbn/workflows/managed';
import { anonymizationApiPrivileges } from '../../common/anonymization_features';

const WORKFLOW_ID_FOR_SPACE = (spaceId: string) =>
  `${INFERENCE_PII_ANONYMIZATION_WORKFLOW_ID}-${spaceId}`;

const builtInRuleSchema = schema.object({
  entityClass: schema.oneOf([
    schema.literal('EMAIL'),
    schema.literal('IP'),
    schema.literal('HOST_NAME'),
    schema.literal('USER_NAME'),
  ]),
  enabled: schema.boolean(),
});

const customRuleSchema = schema.object({
  id: schema.string({ minLength: 1, maxLength: 128 }),
  name: schema.string({ minLength: 1, maxLength: 256 }),
  entityClass: schema.oneOf([
    schema.literal('EMAIL'),
    schema.literal('IP'),
    schema.literal('HOST_NAME'),
    schema.literal('USER_NAME'),
    schema.literal('URL'),
    schema.literal('CLOUD_ACCOUNT'),
    schema.literal('ENTITY_NAME'),
    schema.literal('RESOURCE_NAME'),
    schema.literal('RESOURCE_ID'),
  ]),
  pattern: schema.string({ minLength: 1, maxLength: 2048 }),
  enabled: schema.boolean(),
});

/** Minimal spaces contract needed — both SpacesServiceSetup and SpacesServiceStart satisfy this. */
interface SpacesLike {
  getSpaceId(request: KibanaRequest): string;
}

export const registerAnonymizationSettingsRoutes = ({
  router,
  spaces,
  management,
  getClient,
  baseFailureMode,
}: {
  router: IRouter;
  spaces: SpacesLike;
  management: WorkflowsManagementApi;
  getClient: () => Promise<PluginScopedManagedWorkflowsApi>;
  baseFailureMode: 'block' | 'allow_unsafe';
}) => {
  // GET /internal/inference_workflows/anonymization/settings
  router.get(
    {
      path: '/internal/inference_workflows/anonymization/settings',
      security: {
        authz: {
          requiredPrivileges: [anonymizationApiPrivileges.read],
        },
      },
      validate: {},
    },
    async (_ctx, request, response) => {
      const spaceId = spaces.getSpaceId(request);
      const client = await getClient();

      const [status, state] = await Promise.all([
        client.getWorkflowStatus(INFERENCE_PII_ANONYMIZATION_WORKFLOW_ID, {
          spaceId,
          workflowIdSuffix: spaceId,
        }),
        client.getInstalledWorkflowState(WORKFLOW_ID_FOR_SPACE(spaceId), spaceId),
      ]);

      const templateValues =
        (state?.templateValues as InferencePiiAnonymizationTemplateValues | null) ??
        INFERENCE_PII_ANONYMIZATION_DEFAULTS;

      return response.ok({
        body: {
          managementState: status.status,
          enabled: status.enabled ?? false,
          builtInRules: templateValues.builtInRules,
          customRules: templateValues.customRules,
          failureMode: templateValues.failureMode,
          baseFailureMode,
        },
      });
    }
  );

  // PUT /internal/inference_workflows/anonymization/settings
  router.put(
    {
      path: '/internal/inference_workflows/anonymization/settings',
      security: {
        authz: {
          requiredPrivileges: [anonymizationApiPrivileges.manage],
        },
      },
      validate: {
        body: schema.object({
          /** Toggle masking on/off for this space. When present, applied via updateWorkflow
           *  (enablement-only path) to avoid overwriting the existing YAML. */
          enabled: schema.maybe(schema.boolean()),
          builtInRules: schema.maybe(schema.arrayOf(builtInRuleSchema, { maxSize: 20 })),
          customRules: schema.maybe(schema.arrayOf(customRuleSchema, { maxSize: 100 })),
          /** Per-space override; undefined = inherit kibana.yml base value. */
          failureMode: schema.maybe(
            schema.oneOf([schema.literal('block'), schema.literal('allow_unsafe')])
          ),
        }),
      },
    },
    async (_ctx, request, response) => {
      const spaceId = spaces.getSpaceId(request);
      const client = await getClient();
      const { enabled, builtInRules, customRules, failureMode } = request.body;

      // Reject writes when the managed workflow has been cloned/replaced.
      const status = await client.getWorkflowStatus(INFERENCE_PII_ANONYMIZATION_WORKFLOW_ID, {
        spaceId,
        workflowIdSuffix: spaceId,
      });
      if (status.status !== 'intact' && status.status !== 'disabled') {
        return response.conflict({
          body: {
            message: `Anonymization settings cannot be updated: workflow management state is '${status.status}'. Edit the workflow YAML directly.`,
          },
        });
      }

      // If any template values are being updated, reinstall with the merged values.
      if (builtInRules !== undefined || customRules !== undefined || failureMode !== undefined) {
        const state = await client.getInstalledWorkflowState(
          WORKFLOW_ID_FOR_SPACE(spaceId),
          spaceId
        );
        const existing =
          (state?.templateValues as InferencePiiAnonymizationTemplateValues | null) ??
          INFERENCE_PII_ANONYMIZATION_DEFAULTS;

        const newValues: InferencePiiAnonymizationTemplateValues = {
          builtInRules:
            (builtInRules as InferencePiiBuiltInRule[] | undefined) ?? existing.builtInRules,
          customRules:
            (customRules as InferencePiiCustomRule[] | undefined) ?? existing.customRules,
          // Explicit null/undefined to remove an override; only set when the field is present in body.
          failureMode:
            failureMode !== undefined
              ? (failureMode as 'block' | 'allow_unsafe' | undefined)
              : existing.failureMode,
        };

        await client.install(INFERENCE_PII_ANONYMIZATION_WORKFLOW_ID, {
          spaceId,
          workflowIdSuffix: spaceId,
          values: newValues,
        });
      }

      // Toggle enabled state independently (enablement-only update on managed workflow).
      if (enabled !== undefined) {
        const workflowId = WORKFLOW_ID_FOR_SPACE(spaceId);
        await management.updateWorkflow(workflowId, { enabled }, spaceId, request);
      }

      return response.ok({ body: { updated: true } });
    }
  );
};
