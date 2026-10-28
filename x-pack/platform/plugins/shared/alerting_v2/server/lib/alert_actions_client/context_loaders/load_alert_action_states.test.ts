/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createQueryService } from '../../services/query_service/query_service.mock';
import { getAlertActionStateESQLResponse, getEmptyESQLResponse } from '../fixtures/query_responses';
import { loadAlertActionStatesByEpisodeId } from './load_alert_action_states';

describe('loadAlertActionStatesByEpisodeId', () => {
  const SPACE_ID = 'default';

  const setup = () => createQueryService();

  it('short-circuits on an empty input without issuing any ES|QL query', async () => {
    const { queryService, mockEsClient } = setup();

    const states = await loadAlertActionStatesByEpisodeId({
      queryService,
      spaceId: SPACE_ID,
      episodeIds: [],
    });

    expect(states.size).toBe(0);
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });

  it('issues a single query over .alert-actions keyed by a deduplicated alert_id IN clause', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(getAlertActionStateESQLResponse());

    await loadAlertActionStatesByEpisodeId({
      queryService,
      spaceId: SPACE_ID,
      episodeIds: ['ep-1', 'ep-2', 'ep-1'],
    });

    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
    const { query } = mockEsClient.esql.query.mock.calls[0][0];
    expect(query).toContain('FROM ".alert-actions"');
    expect(query).toContain(`space_id == "${SPACE_ID}"`);
    expect(query).toMatch(/alert_id IN \("ep-1",\s*"ep-2"\)/);
    expect(query).toContain('action_type IN ("ack", "unack", "assign", "tag")');
    expect(query).toContain('BY alert_id');
  });

  it('reads the state of every returned alert, keyed by episode id', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getAlertActionStateESQLResponse([
        {
          alert_id: 'ep-1',
          last_ack_action: 'ack',
          last_assignee_uid: 'user-1',
          last_tags: ['prod', 'db'],
        },
        { alert_id: 'ep-2' },
      ])
    );

    const states = await loadAlertActionStatesByEpisodeId({
      queryService,
      spaceId: SPACE_ID,
      episodeIds: ['ep-1', 'ep-2'],
    });

    expect(states.get('ep-1')).toEqual({
      acknowledged: true,
      assignee_uid: 'user-1',
      tags: ['prod', 'db'],
    });
    expect(states.get('ep-2')).toEqual({
      acknowledged: false,
      assignee_uid: null,
      tags: [],
    });
  });

  it('treats a trailing unack as not acknowledged', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getAlertActionStateESQLResponse([{ alert_id: 'ep-1', last_ack_action: 'unack' }])
    );

    const states = await loadAlertActionStatesByEpisodeId({
      queryService,
      spaceId: SPACE_ID,
      episodeIds: ['ep-1'],
    });

    expect(states.get('ep-1')?.acknowledged).toBe(false);
  });

  it('normalizes a single returned tag into an array', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getAlertActionStateESQLResponse([{ alert_id: 'ep-1', last_tags: 'prod' }])
    );

    const states = await loadAlertActionStatesByEpisodeId({
      queryService,
      spaceId: SPACE_ID,
      episodeIds: ['ep-1'],
    });

    expect(states.get('ep-1')?.tags).toEqual(['prod']);
  });

  it('returns an empty map when the alerts have no recorded actions', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(getEmptyESQLResponse());

    const states = await loadAlertActionStatesByEpisodeId({
      queryService,
      spaceId: SPACE_ID,
      episodeIds: ['ep-1'],
    });

    expect(states.size).toBe(0);
  });
});
