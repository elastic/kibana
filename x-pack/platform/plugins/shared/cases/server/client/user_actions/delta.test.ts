/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMockArgs } from '../mocks';
import { createMockClient } from '../metrics/test_utils/client';
import { getDelta, recordView } from './delta';

describe('user actions delta', () => {
  const client = createMockClient();
  const clientArgs = createCasesClientMockArgs();
  const { lastViewedService, userActionService } = clientArgs.services;
  const since = '2026-11-20T09:00:00.000Z';

  const userActionSO = (id: string, createdBy: { username: string; profile_uid: string }) => ({
    id,
    attributes: {
      type: 'status',
      action: 'update',
      created_at: '2026-11-20T10:00:00.000Z',
      created_by: { full_name: null, email: null, ...createdBy },
      payload: { status: 'closed' },
      owner: 'securitySolution',
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    userActionService.finder.findAll = jest.fn().mockResolvedValue([]);
  });

  describe('getDelta', () => {
    it('returns an empty delta on a first visit without reading user actions', async () => {
      lastViewedService.getSeenAt.mockResolvedValue(null);

      const result = await getDelta({ caseId: 'case-1' }, client, clientArgs);

      expect(result).toEqual({
        since: null,
        counts: { alerts: 0, comments: 0, changes: 0, evidence: 0 },
        items: [],
      });
      expect(userActionService.finder.findAll).not.toHaveBeenCalled();
    });

    it('summarizes the activity of other users since the window start', async () => {
      lastViewedService.getSeenAt.mockResolvedValue(since);
      userActionService.finder.findAll = jest
        .fn()
        .mockResolvedValue([
          userActionSO('by-sam', { username: 'sam', profile_uid: 'u_sam' }),
          userActionSO('by-me', clientArgs.user as never),
        ]);

      const result = await getDelta({ caseId: 'case-1' }, client, clientArgs);

      expect(result.since).toBe(since);
      expect(result.counts.changes).toBe(1);
      expect(result.items.map(({ id }) => id)).toEqual(['by-sam']);
    });

    it('reads the window of the current user for the case', async () => {
      lastViewedService.getSeenAt.mockResolvedValue(null);

      await getDelta({ caseId: 'case-1' }, client, clientArgs);

      expect(lastViewedService.getSeenAt).toHaveBeenCalledWith({
        userKey: clientArgs.user.profile_uid,
        key: 'cases:case-1',
      });
    });

    it('checks that the user can read the case', async () => {
      lastViewedService.getSeenAt.mockResolvedValue(null);

      await getDelta({ caseId: 'case-1' }, client, clientArgs);

      expect(client.cases.resolve).toHaveBeenCalledWith({ id: 'case-1', includeComments: false });
    });

    it('throws when the user cannot read the case', async () => {
      client.cases.resolve.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(getDelta({ caseId: 'case-1' }, client, clientArgs)).rejects.toThrow(
        'Failed to compute delta for case id: case-1'
      );
    });
  });

  describe('recordView', () => {
    it('records the view and returns the window start', async () => {
      lastViewedService.record.mockResolvedValue(since);

      const result = await recordView({ caseId: 'case-1', markSeen: true }, client, clientArgs);

      expect(result).toEqual({ since });
      expect(lastViewedService.record).toHaveBeenCalledWith({
        userKey: clientArgs.user.profile_uid,
        key: 'cases:case-1',
        markSeen: true,
      });
    });

    it('falls back to the username when the user has no profile', async () => {
      const args = {
        ...clientArgs,
        user: { ...clientArgs.user, profile_uid: undefined },
      };
      lastViewedService.record.mockResolvedValue(null);

      await recordView({ caseId: 'case-1' }, client, args);

      expect(lastViewedService.record).toHaveBeenCalledWith(
        expect.objectContaining({ userKey: clientArgs.user.username })
      );
    });

    it('does not record a view for an anonymous user', async () => {
      const args = {
        ...clientArgs,
        user: { username: null, email: null, full_name: null },
      };

      const result = await recordView({ caseId: 'case-1' }, client, args);

      expect(result).toEqual({ since: null });
      expect(lastViewedService.record).not.toHaveBeenCalled();
    });

    it('does not record a view when the user cannot read the case', async () => {
      client.cases.resolve.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(recordView({ caseId: 'case-1' }, client, clientArgs)).rejects.toThrow(
        'Failed to record view for case id: case-1'
      );
      expect(lastViewedService.record).not.toHaveBeenCalled();
    });
  });
});
