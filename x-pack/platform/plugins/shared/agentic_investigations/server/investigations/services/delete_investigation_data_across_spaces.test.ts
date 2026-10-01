/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteInvestigationDataAcrossSpaces } from './delete_investigation_data_across_spaces';

describe('deleteInvestigationDataAcrossSpaces', () => {
  it('deletes the data of every investigation with subjects, per space, until none is left', async () => {
    const findConversationsAcrossSpaces = jest
      .fn()
      .mockResolvedValueOnce([
        { spaceId: 'default', conversationId: 'a' },
        { spaceId: 'other', conversationId: 'b' },
        { spaceId: 'default', conversationId: 'c' },
      ])
      .mockResolvedValueOnce([]);
    const subjects = {
      findConversationsAcrossSpaces,
      deleteByConversationIds: jest.fn(async (ids: string[]) => ids.length),
    };
    const impact = { deleteByConversationIds: jest.fn().mockResolvedValue(1) };
    const hypotheses = { deleteByConversationIds: jest.fn().mockResolvedValue(0) };
    const deleteAllClaims = jest.fn().mockResolvedValue(4);

    const result = await deleteInvestigationDataAcrossSpaces({
      subjects,
      impact,
      hypotheses,
      deleteAllClaims,
    });

    expect(impact.deleteByConversationIds).toHaveBeenCalledWith(['a', 'c'], 'default');
    expect(impact.deleteByConversationIds).toHaveBeenCalledWith(['b'], 'other');
    expect(hypotheses.deleteByConversationIds).toHaveBeenCalledWith(['a', 'c'], 'default');
    expect(subjects.deleteByConversationIds).toHaveBeenCalledWith(['b'], 'other');
    expect(findConversationsAcrossSpaces).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      investigations: 3,
      subjects: 3,
      subjectClaims: 4,
      impact: 2,
      hypotheses: 0,
    });
  });

  it('only clears the claims when no investigation has subjects', async () => {
    const impact = { deleteByConversationIds: jest.fn() };

    const result = await deleteInvestigationDataAcrossSpaces({
      subjects: {
        findConversationsAcrossSpaces: jest.fn().mockResolvedValue([]),
        deleteByConversationIds: jest.fn(),
      },
      impact,
      hypotheses: { deleteByConversationIds: jest.fn() },
      deleteAllClaims: jest.fn().mockResolvedValue(0),
    });

    expect(impact.deleteByConversationIds).not.toHaveBeenCalled();
    expect(result).toEqual({
      investigations: 0,
      subjects: 0,
      subjectClaims: 0,
      impact: 0,
      hypotheses: 0,
    });
  });
});
