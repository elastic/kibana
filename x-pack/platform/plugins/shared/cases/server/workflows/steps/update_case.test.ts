/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { updateCaseStepDefinition } from './update_case';
import type { CasesClient } from '../../client';

const createContext = (input: unknown): StepHandlerContext =>
  ({
    input,
    rawInput: input,
    config: {},
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue({} as KibanaRequest),
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    abortSignal: new AbortController().signal,
    stepId: 'test-step-id',
    stepType: 'cases.updateCase',
  } as unknown as StepHandlerContext);

describe('updateCaseStepDefinition', () => {
  const input = {
    case_id: 'case-1',
    updates: { title: 'Updated title' },
  };

  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = updateCaseStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.updateCase');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(input).success).toBe(true);
  });

  it('fetches version and updates case', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = jest
      .fn()
      .mockResolvedValue([{ ...createCaseResponseFixture, title: 'Updated title' }]);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = updateCaseStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(get).toHaveBeenCalledWith({ id: 'case-1', includeComments: false });
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        {
          id: 'case-1',
          version: createCaseResponseFixture.version,
          title: 'Updated title',
        },
      ],
    });
    expect(result).toEqual({
      output: {
        case: { ...createCaseResponseFixture, title: 'Updated title' },
      },
    });
  });

  it('returns error when update call throws', async () => {
    const updateError = new Error('update failed');
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = jest.fn().mockRejectedValue(updateError);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = updateCaseStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(result).toEqual({ error: updateError });
  });
});
