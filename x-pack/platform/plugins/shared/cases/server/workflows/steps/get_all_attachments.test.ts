/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClient } from '../../client';
import { getAllAttachmentsStepDefinition } from './get_all_attachments';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.getAllAttachments' });

const userCommentFixture = {
  id: 'comment-1',
  type: 'user' as const,
  comment: 'Investigating now',
  owner: 'securitySolution',
  created_at: '2020-02-19T23:06:33.798Z',
  created_by: { full_name: 'Leslie Knope', username: 'lknope', email: 'leslie.knope@elastic.co' },
  pushed_at: null,
  pushed_by: null,
  updated_at: null,
  updated_by: null,
  version: 'WzQ3LDFc',
};

describe('getAllAttachmentsStepDefinition', () => {
  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = getAllAttachmentsStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.getAllAttachments');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse({ case_id: 'case-1' }).success).toBe(true);
  });

  it('calls attachments.getAll with correct params and returns all attachments', async () => {
    const getAll = jest.fn().mockResolvedValue([userCommentFixture]);
    const getCasesClient = jest.fn().mockResolvedValue({
      attachments: { getAll },
    } as unknown as CasesClient);
    const definition = getAllAttachmentsStepDefinition(getCasesClient);

    const result = await definition.handler(createContext({ case_id: 'case-1' }));

    expect(getAll).toHaveBeenCalledWith({ caseID: 'case-1' });
    expect(result).toEqual({
      output: { attachments: [userCommentFixture] },
    });
  });

  it('returns empty attachments array when case has none', async () => {
    const getAll = jest.fn().mockResolvedValue([]);
    const getCasesClient = jest.fn().mockResolvedValue({
      attachments: { getAll },
    } as unknown as CasesClient);
    const definition = getAllAttachmentsStepDefinition(getCasesClient);

    const result = await definition.handler(createContext({ case_id: 'case-1' }));

    expect(result).toEqual({ output: { attachments: [] } });
  });

  it('returns error when attachments.getAll throws', async () => {
    // FAILURE SCENARIO: client throws (e.g. case not found or auth failure)
    const getAll = jest.fn().mockRejectedValue(new Error('not found'));
    const getCasesClient = jest.fn().mockResolvedValue({
      attachments: { getAll },
    } as unknown as CasesClient);
    const definition = getAllAttachmentsStepDefinition(getCasesClient);

    await expect(definition.handler(createContext({ case_id: 'case-1' }))).rejects.toThrow(
      'not found'
    );
  });
});
