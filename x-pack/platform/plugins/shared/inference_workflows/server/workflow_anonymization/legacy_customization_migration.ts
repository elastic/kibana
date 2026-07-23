/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import type { AnonymizationProfile } from '@kbn/anonymization-common';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { ISavedObjectsRepository, KibanaRequest, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { AnonymizationPolicyService } from '@kbn/anonymization-plugin/server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import { INFERENCE_PII_ANONYMIZATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { parse, stringify } from 'yaml';
import { z } from '@kbn/zod/v4';
import {
  ANONYMIZATION_MIGRATION_SAVED_OBJECT_ID,
  ANONYMIZATION_MIGRATION_SAVED_OBJECT_TYPE,
  type AnonymizationMigrationAttributes,
} from '../saved_objects';
import { legacyMigrationRunsCounter } from './anonymization_metrics';

type MigrationManagement = Pick<WorkflowsManagementApi, 'createWorkflow' | 'getWorkflow'>;

const getEnabledRules = (profile: AnonymizationProfile) => ({
  regexRules: profile.rules.regexRules
    .filter(({ enabled }) => enabled)
    .map(({ entityClass, pattern }) => ({ entityClass, pattern }))
    .sort((left, right) =>
      `${left.entityClass}:${left.pattern}`.localeCompare(`${right.entityClass}:${right.pattern}`)
    ),
  nerRules: profile.rules.nerRules
    .filter(({ enabled }) => enabled)
    .map(({ modelId, allowedEntityClasses }) => ({
      modelId: modelId ?? '',
      allowedEntityClasses: [...allowedEntityClasses].sort(),
    }))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
});

const createSourceHash = (rules: ReturnType<typeof getEnabledRules>): string =>
  createHash('sha256').update(JSON.stringify(rules)).digest('hex');

const managedWorkflowYamlSchema = z
  .object({
    name: z.string(),
    enabled: z.boolean(),
    tags: z.array(z.string()).optional(),
    steps: z.array(
      z
        .object({
          type: z.string(),
          with: z
            .object({ rules: z.array(z.unknown()).optional() })
            .passthrough()
            .optional(),
        })
        .passthrough()
    ),
  })
  .passthrough();

const createMigratedYaml = ({
  sourceYaml,
  sourceHash,
  regexRules,
}: {
  sourceYaml: string;
  sourceHash: string;
  regexRules: ReturnType<typeof getEnabledRules>['regexRules'];
}): string => {
  const workflow = managedWorkflowYamlSchema.parse(parse(sourceYaml));
  const anonymizationStep = workflow.steps.find(({ type }) => type === 'ai.pii');
  if (!anonymizationStep?.with?.rules) {
    throw new Error('Managed inference anonymization workflow has no ai.pii rules');
  }

  workflow.name = `${workflow.name} (migrated custom rules)`;
  workflow.enabled = false;
  workflow.tags = [
    ...new Set([
      ...(workflow.tags ?? []),
      'legacy-anonymization-migration',
      `source-hash:${sourceHash}`,
    ]),
  ];
  anonymizationStep.with.rules.push(
    ...regexRules.map(({ entityClass, pattern }) => ({
      type: 'RegExp',
      enabled: true,
      entityClass,
      pattern,
    }))
  );
  return stringify(workflow);
};

export interface LegacyCustomizationMigration {
  run(spaceId: string, request: KibanaRequest): Promise<void>;
}

export const createLegacyCustomizationMigration = ({
  policyService,
  management,
  repository,
  logger,
}: {
  policyService: AnonymizationPolicyService;
  management: MigrationManagement;
  repository: ISavedObjectsRepository;
  logger: Logger;
}): LegacyCustomizationMigration => {
  let activeMigration: Promise<void> | undefined;

  const migrate = async (request: KibanaRequest): Promise<void> => {
    await policyService.ensureGlobalProfile(DEFAULT_SPACE_ID);
    const profile = await policyService.getGlobalProfile(DEFAULT_SPACE_ID);
    if (!profile) {
      legacyMigrationRunsCounter.add(1, { outcome: 'skipped' });
      return;
    }
    const rules = getEnabledRules(profile);
    if (rules.regexRules.length === 0 && rules.nerRules.length === 0) {
      legacyMigrationRunsCounter.add(1, { outcome: 'skipped' });
      return;
    }

    const sourceHash = createSourceHash(rules);
    const scopedRepository = repository.asScopedToNamespace(DEFAULT_SPACE_ID);
    try {
      const existing = await scopedRepository.get<AnonymizationMigrationAttributes>(
        ANONYMIZATION_MIGRATION_SAVED_OBJECT_TYPE,
        ANONYMIZATION_MIGRATION_SAVED_OBJECT_ID
      );
      if (existing.attributes.sourceHash === sourceHash) {
        legacyMigrationRunsCounter.add(1, { outcome: 'skipped' });
        return;
      }
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw error;
      }
    }

    let cloneId: string | undefined;
    if (rules.regexRules.length > 0) {
      cloneId = `inference-pii-anonymization-migration-${sourceHash.slice(0, 16)}`;
      const existingClone = await management.getWorkflow(cloneId, DEFAULT_SPACE_ID);
      if (!existingClone) {
        const managedWorkflowId = `${INFERENCE_PII_ANONYMIZATION_WORKFLOW_ID}-${DEFAULT_SPACE_ID}`;
        const managedWorkflow = await management.getWorkflow(managedWorkflowId, DEFAULT_SPACE_ID);
        if (!managedWorkflow) {
          throw new Error('Managed inference anonymization workflow is not installed');
        }
        const yaml = createMigratedYaml({
          sourceYaml: managedWorkflow.yaml,
          sourceHash,
          regexRules: rules.regexRules,
        });
        await management.createWorkflow({ id: cloneId, yaml }, DEFAULT_SPACE_ID, request, {
          originManagedWorkflowId: INFERENCE_PII_ANONYMIZATION_WORKFLOW_ID,
        });
      }
    }

    const status = rules.nerRules.length > 0 ? 'needs_ner_review' : 'completed';
    await scopedRepository.create<AnonymizationMigrationAttributes>(
      ANONYMIZATION_MIGRATION_SAVED_OBJECT_TYPE,
      { sourceHash, cloneId, status, timestamp: new Date().toISOString() },
      { id: ANONYMIZATION_MIGRATION_SAVED_OBJECT_ID, overwrite: true }
    );

    legacyMigrationRunsCounter.add(1, { outcome: status });

    if (status === 'needs_ner_review') {
      logger.warn(
        'Legacy inference anonymization contains enabled NER rules that require administrative review'
      );
    }
    if (cloneId) {
      logger.warn(
        `Created disabled inference anonymization workflow clone '${cloneId}'; review it before activation`
      );
    }
  };

  return {
    run: async (spaceId, request) => {
      if (spaceId !== DEFAULT_SPACE_ID) {
        return;
      }
      if (!activeMigration) {
        activeMigration = migrate(request).catch((error: unknown) => {
          activeMigration = undefined;
          throw error;
        });
      }
      await activeMigration;
    },
  };
};
