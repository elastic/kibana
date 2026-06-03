/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode as decodeRison } from '@kbn/rison';
import { EPISODES_LIST_LOCATOR_ID, EpisodesListLocatorDefinition } from './episodes_list_locator';
import { EPISODES_LIST_APP_STATE_KEY, decodeEpisodesListRecord } from './episodes_list_url_state';

const EPISODES_PATH = '/alertingV2/episodes';

const readEpisodesListFromPath = (path: string) => {
  const queryIndex = path.indexOf('?');
  if (queryIndex === -1) {
    return undefined;
  }
  const params = new URLSearchParams(path.slice(queryIndex + 1));
  const a = params.get('_a');
  if (!a) {
    return undefined;
  }
  const blob = decodeRison(a) as Record<string, unknown>;
  return decodeEpisodesListRecord(blob[EPISODES_LIST_APP_STATE_KEY]);
};

describe('EpisodesListLocatorDefinition', () => {
  const locator = new EpisodesListLocatorDefinition();

  it('exposes the stable locator id', () => {
    expect(locator.id).toBe(EPISODES_LIST_LOCATOR_ID);
  });

  it('points at the episodes app in management with no query when params are empty', async () => {
    const location = await locator.getLocation({});
    expect(location).toEqual({ app: 'management', path: EPISODES_PATH, state: {} });
  });

  it('omits an unspecified status (defaults to active)', async () => {
    const location = await locator.getLocation({ ruleId: 'rule-1' });
    expect(location.path).toContain(`${EPISODES_PATH}?`);
    expect(readEpisodesListFromPath(location.path)).toEqual({ ruleId: 'rule-1' });
  });

  it('encodes "all" status explicitly', async () => {
    const location = await locator.getLocation({ status: 'all' });
    const decoded = readEpisodesListFromPath(location.path);
    expect(decoded && 'status' in decoded).toBe(true);
    expect(decoded?.status).toBeUndefined();
  });

  it('round-trips filters and a custom time range through the URL', async () => {
    const params = {
      ruleId: 'rule-1',
      status: 'pending',
      queryString: 'host:web',
      tags: ['a', 'b'],
      assigneeUid: 'u-1',
      timeRange: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
    };
    const location = await locator.getLocation(params);
    expect(readEpisodesListFromPath(location.path)).toEqual({
      ruleId: 'rule-1',
      status: 'pending',
      queryString: 'host:web',
      tags: ['a', 'b'],
      assigneeUid: 'u-1',
      timeRange: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
    });
  });
});
