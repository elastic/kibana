/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { ISavedObjectsRepository, KibanaRequest, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
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

interface ParsedRegexRule {
  readonly entityClass: string;
  readonly pattern: string;
}

interface ParsedNerRule {
  readonly modelId: string;
  readonly allowedEntityClasses: readonly string[];
}

interface ParsedSettings {
  readonly regexRules: readonly ParsedRegexRule[];
  readonly nerRules: readonly ParsedNerRule[];
}

// Parses the `ai:anonymizationSettings` Kibana advanced setting JSON.
// Format: { rules: [{ type: 'RegExp'|'NER', enabled: boolean, ... }] }
const parseAnonymizationSettings = (settingsString: string): ParsedSettings => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(settingsString);
  } catch {
    return { regexRules: [], nerRules: [] };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { regexRules: [], nerRules: [] };
  }

  const raw = parsed as Record<string, unknown>;
  if (!Array.isArray(raw.rules)) {
    return { regexRules: [], nerRules: [] };
  }

  const regexRules: ParsedRegexRule[] = [];
  const nerRules: ParsedNerRule[] = [];

  for (const item of raw.rules) {
    if (typeof item !== 'object' || item === null) continue;
    const rule = item as Record<string, unknown>;

    if (
      rule.type === 'RegExp' &&
      rule.enabled === true &&
      typeof rule.entityClass === 'string' &&
      typeof rule.pattern === 'string'
    ) {
      regexRules.push({ entityClass: rule.entityClass, pattern: rule.pattern });
    } else if (rule.type === 'NER' && rule.enabled === true) {
      const modelId = typeof rule.modelId === 'string' ? rule.modelId : '';
      const allowedEntityClasses = Array.isArray(rule.allowedEntityClasses)
        ? rule.allowedEntityClasses.filter((c): c is string => typeof c === 'string').sort()
        : [];
      nerRules.push({ modelId, allowedEntityClasses });
    }
  }

  // Sort for deterministic hash — same rules in different order must produce the same hash.
  regexRules.sort((a, b) =>
    `${a.entityClass}:${a.pattern}`.localeCompare(`${b.entityClass}:${b.pattern}`)
  );
  nerRules.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

  return { regexRules, nerRules };
};

const createSourceHash = (rules: ParsedSettings): string =>
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
  regexRules: readonly ParsedRegexRule[];
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
  getLegacySettings,
  management,
  repository,
  logger,
}: {
  getLegacySettings: () => Promise<string | undefined>;
  management: MigrationManagement;
  repository: ISavedObjectsRepository;
  logger: Logger;
}): LegacyCustomizationMigration => {
  let activeMigration: Promise<void> | undefined;

  const migrate = async (request: KibanaRequest): Promise<void> => {
    const settingsString = await getLegacySettings();
    if (!settingsString) {
      legacyMigrationRunsCounter.add(1, { outcome: 'skipped' });
      return;
    }
    const rules = parseAnonymizationSettings(settingsString);
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
