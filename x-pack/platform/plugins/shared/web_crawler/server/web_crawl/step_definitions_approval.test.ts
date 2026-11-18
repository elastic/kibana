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
import { webCrawlStepCommonDefinition } from '../../common/web_crawl_step';

/**
 * Each custom workflow step needs a CI approval file at
 * `<workflows_extensions>/test/scout/api/fixtures/approved_step_definitions/<step.id>.txt`
 * with the SHA-256 of the step's serializable contract (schemas and metadata, not handler
 * logic). The hash is computed exactly like the server route (`get_step_definitions.ts`).
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

const DEFINITIONS = [webCrawlStepCommonDefinition] as unknown as CommonStepDefinition[];

describe('web crawl workflow step definition approvals', () => {
  it('every web crawl step contract matches its approved hash', () => {
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
        `Found ${fixCommands.length} web crawl step definition(s) whose approval file is missing or ` +
          `stale. Run the following command(s) from the kibana root and request review from the ` +
          `workflows-eng team:\n\n${fixCommands.join('\n')}\n`
      );
    }
  });
});
