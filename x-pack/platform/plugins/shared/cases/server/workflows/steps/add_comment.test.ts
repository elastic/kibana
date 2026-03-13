/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { addCommentStepDefinition } from './add_comment';
import { createStepHandlerContext } from './test_utils';
import type { CasesClient } from '../../client';

const createContext = (input: unknown, config: Record<string, unknown> = {}) =>
  createStepHandlerContext({ input, config, stepType: 'cases.addComment' });

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

  it('returns error when fetching case fails', async () => {
    const getError = new Error('get failed');
    const get = jest.fn().mockRejectedValue(getError);
    const add = jest.fn();
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
      attachments: { add },
    } as unknown as CasesClient);
    const definition = addCommentStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(add).not.toHaveBeenCalled();
    expect(result).toEqual({ error: getError });
  });

  it('returns normalized case output when comments include unsupported shapes', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const add = jest.fn().mockResolvedValue({
      ...createCaseResponseFixture,
      comments: [
        {
          id: 'event-comment-id',
          type: 'event',
          eventId: ['event-1'],
          index: ['.ds-logs-*'],
          owner: createCaseResponseFixture.owner,
          created_at: '2020-02-19T23:06:33.798Z',
          created_by: createCaseResponseFixture.created_by,
          pushed_at: null,
          pushed_by: null,
          updated_at: null,
          updated_by: null,
          version: 'WzQ3LDFc',
        },
        {
          id: 'alert-comment-id',
          type: 'alert',
          alertId: ['alert-1'],
          index: ['.alerts-security.alerts-default'],
          owner: createCaseResponseFixture.owner,
          rule: { id: null, name: null },
          created_at: '2020-02-19T23:06:33.798Z',
          created_by: createCaseResponseFixture.created_by,
          pushed_at: null,
          pushed_by: null,
          updated_at: null,
          updated_by: null,
          version: 'WzQ3LDFc',
        },
      ],
    });
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
      attachments: { add },
    } as unknown as CasesClient);
    const definition = addCommentStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    const outputCase = result.output?.case;
    if (outputCase == null) {
      throw new Error('Expected output from add comment step');
    }

    expect(outputCase.comments).toHaveLength(1);
    expect(outputCase.comments[0]).toMatchObject({
      id: 'alert-comment-id',
      type: 'alert',
    });
    expect(outputCase.comments[0]).not.toHaveProperty('rule');
  });

  it('pushes case when push-case is enabled', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const add = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const push = jest.fn().mockResolvedValue(undefined);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, push },
      attachments: { add },
    } as unknown as CasesClient);
    const definition = addCommentStepDefinition(getCasesClient);

    await definition.handler(createContext(input, { 'push-case': true }));

    expect(push).toHaveBeenCalledWith({
      caseId: createCaseResponseFixture.id,
      connectorId: createCaseResponseFixture.connector.id,
      pushType: 'automatic',
    });
  });
});
