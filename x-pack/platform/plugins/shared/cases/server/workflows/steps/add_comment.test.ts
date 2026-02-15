/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { addCommentStepDefinition } from './add_comment';
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
    stepType: 'cases.addComment',
  } as unknown as StepHandlerContext);

describe('addCommentStepDefinition', () => {
  const input = {
    case_id: 'case-1',
    comment: 'Investigating now',
  };

  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = addCommentStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.addComment');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(input).success).toBe(true);
  });

  it('adds comment to case', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const add = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
      attachments: { add },
    } as unknown as CasesClient);
    const definition = addCommentStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(get).toHaveBeenCalledWith({ id: 'case-1', includeComments: false });
    expect(add).toHaveBeenCalledWith({
      caseId: 'case-1',
      comment: {
        type: 'user',
        comment: 'Investigating now',
        owner: createCaseResponseFixture.owner,
      },
    });
    expect(result).toEqual({
      output: {
        case: createCaseResponseFixture,
      },
    });
  });

  it('returns error when add comment throws', async () => {
    const addError = new Error('add comment failed');
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const add = jest.fn().mockRejectedValue(addError);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
      attachments: { add },
    } as unknown as CasesClient);
    const definition = addCommentStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(result).toEqual({ error: addError });
  });
});
