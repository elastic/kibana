/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { WorkflowYaml } from '@kbn/workflows';
import { validateWorkflowInputs } from '@kbn/workflows-execution-engine/server/lib/validate_workflow_inputs';
import type { WorkflowExecutionRepository } from '@kbn/workflows-execution-engine/server/repositories/workflow_execution_repository';
import {
  analyzeDependents,
  buildDependentsIndex,
} from '../../common/lib/workflow_dependents/analyze_dependents';

/*
 * Compares whether the dependents analysis breaks a caller for the inputs it sends with whether
 * the engine's input validation rejects them.
 */

const CHILD_ID = 'child';

const childWith = (inputs: Record<string, unknown> | undefined) => ({
  name: 'Child',
  enabled: true,
  triggers: [{ type: 'manual' }],
  ...(inputs ? { inputs } : {}),
  steps: [{ name: 'end', type: 'workflow.output', with: {} }],
});

const analyzerBreaks = (schema: Record<string, unknown>, inputs: Record<string, unknown>) => {
  const caller = {
    id: 'caller',
    name: 'Caller',
    enabled: true,
    definition: {
      name: 'Caller',
      triggers: [{ type: 'manual' }],
      steps: [{ name: 'run', type: 'workflow.execute', with: { 'workflow-id': CHILD_ID, inputs } }],
    },
  };
  const { dependents } = analyzeDependents({
    index: buildDependentsIndex(CHILD_ID, [caller]),
    savedDefinition: childWith(undefined),
    draftDefinition: childWith(schema),
  });
  return dependents[0]?.status === 'breaking';
};

const engineAccepts = (schema: Record<string, unknown>, inputs: Record<string, unknown>) =>
  validateWorkflowInputs(
    {
      id: 'run',
      workflowId: CHILD_ID,
      spaceId: 'default',
      createdAt: '2026-01-01T00:00:00.000Z',
      workflowDefinition: childWith(schema) as WorkflowYaml,
      context: { inputs },
    },
    { updateWorkflowExecution: jest.fn() } as unknown as WorkflowExecutionRepository,
    loggerMock.create()
  );

const MAP_ONLY = { type: 'object', additionalProperties: { type: 'string' }, required: ['token'] };
const NESTED = {
  properties: {
    config: {
      type: 'object',
      properties: {
        options: {
          type: 'object',
          properties: { limit: { type: 'number', default: 10 } },
          required: ['limit'],
        },
      },
      required: ['options'],
    },
  },
};

const CASES: Array<[string, Record<string, unknown>, Record<string, unknown>]> = [
  ['a map-only schema, without a key it requires', MAP_ONLY, {}],
  ['a map-only schema, with every key it requires', MAP_ONLY, { token: 'abc' }],
  ['a map-only schema, with a value of the wrong type', MAP_ONLY, { token: 1 }],
  ['an object whose missing nested field has a default', NESTED, { config: {} }],
  ['an object with a rejected nested value', NESTED, { config: { options: { limit: 'ten' } } }],
  [
    'a required input with a default, left out',
    { properties: { name: { type: 'string', default: 'x' } }, required: ['name'] },
    {},
  ],
  [
    'a required input without a default, left out',
    { properties: { name: { type: 'string' } }, required: ['name'] },
    {},
  ],
];

describe('dependents analysis and engine input validation', () => {
  it.each(CASES)('agree on %s', async (_name, schema, inputs) => {
    const accepted = await engineAccepts(schema, inputs);
    expect(analyzerBreaks(schema, inputs)).toBe(!accepted);
  });
});
