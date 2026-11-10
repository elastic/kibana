/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { CONTEXT_ENGINE_DREAMING_WORKFLOW } from '@kbn/workflows/managed';
import { buildAiIndexSpaceFilter } from '../../common/space_filter';

interface Step {
  name: string;
  steps?: Step[];
  with?: { query?: { bool?: { filter?: unknown[] } } };
}

const SPACE = 'team-a';

const steps: Step[] = parse(
  CONTEXT_ENGINE_DREAMING_WORKFLOW.yamlTemplate({
    aiIndexId: 'support',
    instanceKey: 'support-0123456789abcdef',
    memoriesIndex: 'ai-index-idx-support',
    intervalMinutes: 60,
    connectorId: '',
    instructions: '',
    factTypes: [],
    entityTypes: [],
    procedureTypes: [],
  }).replaceAll('{{ workflow.spaceId }}', SPACE)
).steps;

const findStep = (candidates: Step[], name: string): Step | undefined =>
  candidates
    .map((step) => (step.name === name ? step : findStep(step.steps ?? [], name)))
    .find(Boolean);

describe('the dreaming workflow', () => {
  it.each(['read_memories', 'read_existing'])(
    'reads in %s only what the AI index space can see, as every AI index read does',
    (name) => {
      expect(findStep(steps, name)?.with?.query?.bool?.filter).toContainEqual(
        buildAiIndexSpaceFilter(SPACE)
      );
    }
  );
});
