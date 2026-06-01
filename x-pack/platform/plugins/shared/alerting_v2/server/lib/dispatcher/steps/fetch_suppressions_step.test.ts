/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FetchSuppressionsStep } from './fetch_suppressions_step';
import { createQueryService } from '../../services/query_service/query_service.mock';
import { createAlertEpisodeSuppressionsResponse } from '../fixtures/dispatcher';
import { createAlertEpisode, createDispatcherPipelineState } from '../fixtures/test_utils';

describe('FetchSuppressionsStep', () => {
  it('fetches suppressions for provided episodes', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchSuppressionsStep(queryService);

    mockEsClient.esql.query.mockResolvedValueOnce(
      createAlertEpisodeSuppressionsResponse([
        {
          rule_id: 'r1',
          group_hash: 'h1',
          episode_id: 'e1',
          should_suppress: true,
        },
      ])
    );

    const state = createDispatcherPipelineState({
      episodes: [createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' })],
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.suppressions).toHaveLength(1);
    expect(result.data?.suppressions?.[0].should_suppress).toBe(true);
  });

  it('returns empty suppressions when no episodes exist', async () => {
    const { queryService } = createQueryService();
    const step = new FetchSuppressionsStep(queryService);

    const state = createDispatcherPipelineState({ episodes: [] });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.suppressions).toHaveLength(0);
  });

  it('returns empty suppressions when episodes is undefined', async () => {
    const { queryService } = createQueryService();
    const step = new FetchSuppressionsStep(queryService);

    const state = createDispatcherPipelineState();
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.suppressions).toHaveLength(0);
  });
});
