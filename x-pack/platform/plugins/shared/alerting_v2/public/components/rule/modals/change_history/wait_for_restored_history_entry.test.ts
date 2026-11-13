/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListRuleChangeHistoryResponse } from '@kbn/alerting-v2-schemas';
import { waitForRestoredHistoryEntry } from './wait_for_restored_history_entry';

const listResponse = (version?: number): ListRuleChangeHistoryResponse => ({
  items:
    version === undefined
      ? []
      : [
          {
            id: `evt-${version}`,
            created_at: '2026-01-01T00:00:00.000Z',
            actor: { name: 'elastic' },
            action: 'rule_update',
            version,
          },
        ],
  total: version === undefined ? 0 : 1,
});

const createApi = () => ({ listRuleChanges: jest.fn() });

describe('waitForRestoredHistoryEntry', () => {
  it('resolves once the newest entry reaches the restored version', async () => {
    const api = createApi();
    api.listRuleChanges
      .mockResolvedValueOnce(listResponse(3))
      .mockResolvedValueOnce(listResponse(4));

    await waitForRestoredHistoryEntry({
      api,
      ruleId: 'rule-1',
      version: 4,
      signal: new AbortController().signal,
      delaysMs: [0, 0, 0],
    });

    expect(api.listRuleChanges).toHaveBeenCalledTimes(2);
    expect(api.listRuleChanges).toHaveBeenCalledWith({
      id: 'rule-1',
      page: 1,
      perPage: 1,
      signal: expect.any(AbortSignal),
    });
  });

  it('treats a newer entry as the restored one being visible', async () => {
    const api = createApi();
    api.listRuleChanges.mockResolvedValueOnce(listResponse(5));

    await waitForRestoredHistoryEntry({
      api,
      ruleId: 'rule-1',
      version: 4,
      signal: new AbortController().signal,
      delaysMs: [0, 0],
    });

    expect(api.listRuleChanges).toHaveBeenCalledTimes(1);
  });

  it('gives up after the last delay when the entry never shows up', async () => {
    const api = createApi();
    api.listRuleChanges.mockResolvedValue(listResponse());

    await waitForRestoredHistoryEntry({
      api,
      ruleId: 'rule-1',
      version: 4,
      signal: new AbortController().signal,
      delaysMs: [0, 0, 0],
    });

    expect(api.listRuleChanges).toHaveBeenCalledTimes(3);
  });

  it('rejects without checking again once aborted', async () => {
    const api = createApi();
    api.listRuleChanges.mockResolvedValue(listResponse(3));
    const abortController = new AbortController();

    const waiting = waitForRestoredHistoryEntry({
      api,
      ruleId: 'rule-1',
      version: 4,
      signal: abortController.signal,
      delaysMs: [60_000],
    });
    abortController.abort();

    await expect(waiting).rejects.toBeDefined();
    expect(api.listRuleChanges).not.toHaveBeenCalled();
  });
});
