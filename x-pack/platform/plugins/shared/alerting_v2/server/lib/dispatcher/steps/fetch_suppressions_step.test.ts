/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FetchSuppressionsStep } from './fetch_suppressions_step';
import { createQueryService } from '../../services/query_service/query_service.mock';
import { createAlertEpisodeSuppressionsResponse } from '../fixtures/dispatcher';
import {
  createAlertEpisode,
  createAlertEpisodeSuppression,
  createDispatcherPipelineState,
  createStepLogger,
} from '../fixtures/test_utils';
import type { AlertEpisodeSuppression } from '../types';

const logger = createStepLogger();

describe('FetchSuppressionsStep', () => {
  it('fetches suppressions for provided episodes', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchSuppressionsStep(queryService);

    mockEsClient.esql.query.mockResolvedValueOnce(
      createAlertEpisodeSuppressionsResponse([
        createAlertEpisodeSuppression({
          rule_id: 'r1',
          group_hash: 'h1',
          episode_id: 'e1',
          should_suppress: true,
        }),
      ])
    );

    const state = createDispatcherPipelineState({
      episodes: [createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' })],
    });

    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.suppressions?.size).toBe(1);
    expect(
      result.data?.suppressions?.suppressionReasonFor(
        createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' })
      )
    ).toBe('unknown suppression reason');
  });

  it('returns empty suppressions when no episodes exist', async () => {
    const { queryService } = createQueryService();
    const step = new FetchSuppressionsStep(queryService);

    const state = createDispatcherPipelineState({ episodes: [] });
    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.suppressions?.size).toBe(0);
  });

  it('returns empty suppressions when episodes is undefined', async () => {
    const { queryService } = createQueryService();
    const step = new FetchSuppressionsStep(queryService);

    const state = createDispatcherPipelineState();
    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.suppressions?.size).toBe(0);
  });

  it('parses external suppressions (source != internal, null rule_id) correctly', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchSuppressionsStep(queryService);

    mockEsClient.esql.query.mockResolvedValueOnce(
      createAlertEpisodeSuppressionsResponse([
        createAlertEpisodeSuppression({
          rule_id: null,
          source: 'pagerduty',
          group_hash: 'pd-hash',
          episode_id: 'pd-ep-1',
          should_suppress: true,
          last_ack_action: 'ack',
        }),
      ])
    );

    const state = createDispatcherPipelineState({
      episodes: [
        createAlertEpisode({
          source: 'pagerduty',
          rule_id: null,
          group_hash: 'pd-hash',
          episode_id: 'pd-ep-1',
        }),
      ],
    });

    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.suppressions?.size).toBe(1);
    expect(
      result.data?.suppressions?.suppressionReasonFor(
        createAlertEpisode({
          source: 'pagerduty',
          rule_id: null,
          group_hash: 'pd-hash',
          episode_id: 'pd-ep-1',
        })
      )
    ).toBe('ack');
  });

  it('issues multiple ES|QL requests and concatenates results when input exceeds the size budget', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchSuppressionsStep(queryService);

    // pair_key = rule_id::group_hash → ~10 KB per literal forces multiple chunks
    // for 200 episodes against the 600 KB budget.
    const longSegment = 'x'.repeat(5_000);
    const episodes = Array.from({ length: 200 }, (_, i) =>
      createAlertEpisode({
        rule_id: `${longSegment}-r${i}`,
        group_hash: `${longSegment}-g${i}`,
        episode_id: `e${i}`,
      })
    );

    mockEsClient.esql.query.mockImplementation((args: { query: string }) => {
      const rows: AlertEpisodeSuppression[] = [];
      if (args.query.includes(`${longSegment}-r0::`)) {
        rows.push(
          createAlertEpisodeSuppression({
            rule_id: `${longSegment}-r0`,
            group_hash: `${longSegment}-g0`,
            episode_id: 'e0',
            should_suppress: true,
          })
        );
      }
      if (args.query.includes(`${longSegment}-r199::`)) {
        rows.push(
          createAlertEpisodeSuppression({
            rule_id: `${longSegment}-r199`,
            group_hash: `${longSegment}-g199`,
            episode_id: 'e199',
          })
        );
      }
      return Promise.resolve(createAlertEpisodeSuppressionsResponse(rows));
    });

    const state = createDispatcherPipelineState({ episodes });
    const result = await step.execute(state, logger);

    expect(mockEsClient.esql.query.mock.calls.length).toBeGreaterThanOrEqual(2);
    for (const [args] of mockEsClient.esql.query.mock.calls) {
      expect((args.query as string).length).toBeLessThan(1_000_000);
    }

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.suppressions?.size).toBe(2);
    expect(
      result.data?.suppressions?.suppressionReasonFor(
        createAlertEpisode({
          rule_id: `${longSegment}-r0`,
          group_hash: `${longSegment}-g0`,
          episode_id: 'e0',
        })
      )
    ).toBeDefined();
    expect(
      result.data?.suppressions?.suppressionReasonFor(
        createAlertEpisode({
          rule_id: `${longSegment}-r199`,
          group_hash: `${longSegment}-g199`,
          episode_id: 'e199',
        })
      )
    ).toBeUndefined();
  });
});
