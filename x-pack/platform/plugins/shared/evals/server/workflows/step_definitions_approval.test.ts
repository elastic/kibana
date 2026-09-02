/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { createSHA256Hash } from '@kbn/crypto';
import { stableStringify } from '@kbn/std';
import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import {
  resolveDatasetCommonDefinition,
  executeTaskCommonDefinition,
  evaluateTraceCommonDefinition,
  ingestScoresCommonDefinition,
  evaluateExampleCommonDefinition,
  evaluateDatasetCommonDefinition,
  startExperimentCommonDefinition,
  compareExperimentsCommonDefinition,
} from '../../common/workflows/steps';

/**
 * Each custom workflow step requires a CI approval file at
 * `<workflows_extensions>/test/scout/api/fixtures/approved_step_definitions/<step.id>.txt`
 * containing the SHA-256 of the step's serializable contract (schemas + metadata,
 * NOT handler logic). The central Scout approval test in `workflows_extensions`
 * enforces this across every registered step; it is currently skipped
 * (https://github.com/elastic/kibana/issues/265012), so this unit test keeps the
 * evals approval files in sync in the meantime.
 *
 * The hash MUST be computed exactly like the server route
 * (`get_step_definitions.ts`): only `label`, `description`, `category`,
 * `stability`, `deprecation`, and the JSON-Schema of the input/output/config
 * schemas contribute. Server-only fields (handler/poll/start/onCancel/state/
 * ceilings) are intentionally excluded, so computing from the shared `common`
 * definitions matches what the running server registers.
 */

const APPROVED_STEP_DEFINITIONS_DIR_REL =
  'src/platform/plugins/shared/workflows_extensions/test/scout/api/fixtures/approved_step_definitions';
const APPROVED_STEP_DEFINITIONS_DIR_ABS = path.join(REPO_ROOT, APPROVED_STEP_DEFINITIONS_DIR_REL);

const schemaToJson = (schema?: z.ZodType): unknown => (schema ? z.toJSONSchema(schema) : undefined);

const computeDefinitionHash = (definition: CommonStepDefinition): string =>
  createSHA256Hash(
    stableStringify({
      label: definition.label,
      description: definition.description,
      category: definition.category,
      stability: definition.stability,
      deprecation: definition.deprecation,
      inputSchema: schemaToJson(definition.inputSchema),
      outputSchema: schemaToJson(definition.outputSchema),
      configSchema: schemaToJson(definition.configSchema),
    })
  );

const loadApprovedHash = (stepId: string): string | null => {
  try {
    return readFileSync(
      path.join(APPROVED_STEP_DEFINITIONS_DIR_ABS, `${stepId}.txt`),
      'utf8'
    ).trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const DEFINITIONS: CommonStepDefinition[] = [
  resolveDatasetCommonDefinition,
  executeTaskCommonDefinition,
  evaluateTraceCommonDefinition,
  ingestScoresCommonDefinition,
  evaluateExampleCommonDefinition,
  evaluateDatasetCommonDefinition,
  startExperimentCommonDefinition,
  compareExperimentsCommonDefinition,
];

describe('evals workflow step definition approvals', () => {
  it('every evals step contract matches its approved hash', () => {
    const fixCommands: string[] = [];

    for (const definition of DEFINITIONS) {
      const expectedHash = computeDefinitionHash(definition);
      if (loadApprovedHash(definition.id) !== expectedHash) {
        fixCommands.push(
          `echo ${expectedHash} > ${APPROVED_STEP_DEFINITIONS_DIR_REL}/${definition.id}.txt`
        );
      }
    }

    if (fixCommands.length > 0) {
      throw new Error(
        `Found ${fixCommands.length} evals step definition(s) whose approval file is missing or ` +
          `stale. Run the following command(s) from the kibana root and request review from the ` +
          `workflows-eng team:\n\n${fixCommands.join('\n')}\n`
      );
    }
  });
});
