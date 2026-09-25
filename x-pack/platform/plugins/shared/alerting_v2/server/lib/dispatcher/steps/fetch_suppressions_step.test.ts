/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FetchSuppressionsStep } from './fetch_suppressions_step';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { createQueryService } from '../../services/query_service/query_service.mock';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { ESQL_QUERY_ROW_LIMIT } from '../queries';
import {
  createEpisodeSuppressionsResponse,
  createSeriesSuppressionsResponse,
} from '../fixtures/dispatcher';
import {
  createAlertEpisode,
  createDispatcherPipelineState,
  createEpisodeSuppressionRow,
  createSeriesSuppressionRow,
  createStepLogger,
} from '../fixtures/test_utils';
import type { EpisodeSuppressionRow, SeriesSuppressionRow } from '../types';

const logger = createStepLogger();

const isSeriesQuery = (query: string) => query.includes('"snooze"');

type MockEsClient = ReturnType<typeof createQueryService>['mockEsClient'];

const mockSuppressionQueries = (
  mockEsClient: MockEsClient,
  {
    episode = () => [],
    series = () => [],
  }: {
    episode?: (query: string) => EpisodeSuppressionRow[];
    series?: (query: string) => SeriesSuppressionRow[];
  }
) => {
  mockEsClient.esql.query.mockImplementation((args: { query: string }) =>
    Promise.resolve(
      isSeriesQuery(args.query)
        ? createSeriesSuppressionsResponse(series(args.query))
        : createEpisodeSuppressionsResponse(episode(args.query))
    )
  );
};

const rowLimitEpisodeRows = (): EpisodeSuppressionRow[] =>
  Array.from({ length: ESQL_QUERY_ROW_LIMIT }, (_, i) =>
    createEpisodeSuppressionRow({ rule_id: 'r1', group_hash: 'h1', episode_id: `e${i}` })
  );

const rowLimitSeriesRows = (): SeriesSuppressionRow[] =>
  Array.from({ length: ESQL_QUERY_ROW_LIMIT }, (_, i) =>
    createSeriesSuppressionRow({ rule_id: 'r1', group_hash: `h${i}` })
  );

describe('FetchSuppressionsStep', () => {
  it('resolves episode-level suppressions by episode', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchSuppressionsStep(queryService);

    mockSuppressionQueries(mockEsClient, {
      episode: () => [
        createEpisodeSuppressionRow({
          rule_id: 'r1',
          group_hash: 'h1',
          episode_id: 'e1',
          should_suppress: true,
          last_ack_action: 'ack',
        }),
      ],
    });

    const state = createDispatcherPipelineState({
      episodes: [createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' })],
    });

    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    const { suppressions } = result.data ?? {};
    expect(suppressions?.size).toBe(1);
    expect(
      suppressions?.suppressionReasonFor(
        createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' })
      )
    ).toBe('ack');
    // An ack on one episode does not carry over to another episode of the same series.
    expect(
      suppressions?.suppressionReasonFor(
        createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e2' })
      )
    ).toBeUndefined();
  });

  it('resolves series-level rows through the series key for every episode of the series', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchSuppressionsStep(queryService);

    mockSuppressionQueries(mockEsClient, {
      series: () => [
        createSeriesSuppressionRow({
          rule_id: 'r1',
          group_hash: 'h1',
          should_suppress: true,
          last_snooze_action: 'snooze',
        }),
      ],
    });

    const state = createDispatcherPipelineState({
      episodes: [createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' })],
    });

    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    const { suppressions } = result.data ?? {};
    for (const episodeId of ['e1', 'e2']) {
      expect(
        suppressions?.suppressionReasonFor(
          createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: episodeId })
        )
      ).toBe('snooze');
    }
    expect(
      suppressions?.suppressionReasonFor(
        createAlertEpisode({ rule_id: 'r1', group_hash: 'h2', episode_id: 'e1' })
      )
    ).toBeUndefined();
  });

  it('prefers the episode-level reason when the episode is acked and its series snoozed', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchSuppressionsStep(queryService);

    mockSuppressionQueries(mockEsClient, {
      episode: () => [
        createEpisodeSuppressionRow({
          rule_id: 'r1',
          group_hash: 'h1',
          episode_id: 'e1',
          should_suppress: true,
          last_ack_action: 'ack',
        }),
      ],
      series: () => [
        createSeriesSuppressionRow({
          rule_id: 'r1',
          group_hash: 'h1',
          should_suppress: true,
          last_snooze_action: 'snooze',
        }),
      ],
    });

    const state = createDispatcherPipelineState({
      episodes: [createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' })],
    });

    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(
      result.data?.suppressions?.suppressionReasonFor(
        createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' })
      )
    ).toBe('ack');
  });

  it('falls back to the series snooze when the episode ack was lifted', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchSuppressionsStep(queryService);

    mockSuppressionQueries(mockEsClient, {
      episode: () => [
        createEpisodeSuppressionRow({
          rule_id: 'r1',
          group_hash: 'h1',
          episode_id: 'e1',
          should_suppress: false,
          last_ack_action: 'unack',
        }),
      ],
      series: () => [
        createSeriesSuppressionRow({
          rule_id: 'r1',
          group_hash: 'h1',
          should_suppress: true,
          last_snooze_action: 'snooze',
        }),
      ],
    });

    const state = createDispatcherPipelineState({
      episodes: [createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' })],
    });

    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(
      result.data?.suppressions?.suppressionReasonFor(
        createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' })
      )
    ).toBe('snooze');
  });

  it('runs one episode query and one series query with the tick abort signal', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchSuppressionsStep(queryService);
    mockSuppressionQueries(mockEsClient, {});

    const state = createDispatcherPipelineState({
      episodes: [createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' })],
    });

    await step.execute(state, logger);

    const calls = mockEsClient.esql.query.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls.filter(([args]) => isSeriesQuery(args.query as string))).toHaveLength(1);
    for (const [, options] of calls) {
      expect(options).toEqual(expect.objectContaining({ signal: state.input.signal }));
    }
  });

  it('returns empty suppressions when no episodes exist', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchSuppressionsStep(queryService);

    const state = createDispatcherPipelineState({ episodes: [] });
    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.suppressions?.size).toBe(0);
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
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

    mockSuppressionQueries(mockEsClient, {
      episode: () => [
        createEpisodeSuppressionRow({
          rule_id: null,
          source: 'pagerduty',
          group_hash: 'pd-hash',
          episode_id: 'pd-ep-1',
          should_suppress: true,
          last_ack_action: 'ack',
        }),
      ],
    });

    const externalEpisode = createAlertEpisode({
      source: 'pagerduty',
      rule_id: null,
      group_hash: 'pd-hash',
      episode_id: 'pd-ep-1',
    });
    const state = createDispatcherPipelineState({ episodes: [externalEpisode] });

    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.suppressions?.size).toBe(1);
    expect(result.data?.suppressions?.suppressionReasonFor(externalEpisode)).toBe('ack');
  });

  it.each([
    ['episode', { episode: () => rowLimitEpisodeRows() }],
    ['series', { series: () => rowLimitSeriesRows() }],
  ] as const)('warns when the %s suppressions query returns the row limit', async (_, rows) => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService, mockLogger } = createLoggerService();
    const step = new FetchSuppressionsStep(queryService);
    mockSuppressionQueries(mockEsClient, rows);

    const state = createDispatcherPipelineState({
      episodes: [createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e0' })],
    });

    await step.execute(state, loggerService);

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(Function), {
      labels: { code: ALERTING_LOG_CODES.FETCH_SUPPRESSIONS_STEP_ROW_LIMIT_REACHED },
    });
  });

  it('does not warn when every suppressions chunk stays under the row limit', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService, mockLogger } = createLoggerService();
    const step = new FetchSuppressionsStep(queryService);

    mockSuppressionQueries(mockEsClient, {
      episode: () => [
        createEpisodeSuppressionRow({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' }),
      ],
      series: () => [createSeriesSuppressionRow({ rule_id: 'r1', group_hash: 'h1' })],
    });

    const state = createDispatcherPipelineState({
      episodes: [createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' })],
    });

    await step.execute(state, loggerService);

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('concatenates rows across episode chunks when episode ids exceed the row limit', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchSuppressionsStep(queryService);

    const lastIndex = ESQL_QUERY_ROW_LIMIT;
    const episodes = Array.from({ length: lastIndex + 1 }, (_, i) =>
      createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: `e${i}` })
    );

    mockSuppressionQueries(mockEsClient, {
      episode: (query) =>
        [0, lastIndex]
          .filter((i) => query.includes(`"e${i}"`))
          .map((i) =>
            createEpisodeSuppressionRow({
              rule_id: 'r1',
              group_hash: 'h1',
              episode_id: `e${i}`,
              should_suppress: true,
              last_ack_action: 'ack',
            })
          ),
    });

    const state = createDispatcherPipelineState({ episodes });
    const result = await step.execute(state, logger);

    const calls = mockEsClient.esql.query.mock.calls;
    expect(calls.filter(([args]) => !isSeriesQuery(args.query as string))).toHaveLength(2);
    expect(calls.filter(([args]) => isSeriesQuery(args.query as string))).toHaveLength(1);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    const { suppressions } = result.data ?? {};
    expect(suppressions?.size).toBe(2);
    for (const i of [0, lastIndex]) {
      expect(
        suppressions?.suppressionReasonFor(
          createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: `e${i}` })
        )
      ).toBe('ack');
    }
  });

  it('concatenates rows across series chunks when pair keys exceed the size budget', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchSuppressionsStep(queryService);

    // pair_key = rule_id::group_hash → ~10 KB per literal forces multiple chunks
    // for 200 episodes against the 300 KB series budget.
    const longSegment = 'x'.repeat(5_000);
    const episodes = Array.from({ length: 200 }, (_, i) =>
      createAlertEpisode({
        rule_id: `${longSegment}-r${i}`,
        group_hash: `${longSegment}-g${i}`,
        episode_id: `e${i}`,
      })
    );

    mockSuppressionQueries(mockEsClient, {
      series: (query) =>
        [0, 199]
          .filter((i) => query.includes(`${longSegment}-r${i}::`))
          .map((i) =>
            createSeriesSuppressionRow({
              rule_id: `${longSegment}-r${i}`,
              group_hash: `${longSegment}-g${i}`,
              should_suppress: i === 0,
              last_snooze_action: i === 0 ? 'snooze' : 'unsnooze',
            })
          ),
    });

    const state = createDispatcherPipelineState({ episodes });
    const result = await step.execute(state, logger);

    const seriesCalls = mockEsClient.esql.query.mock.calls.filter(([args]) =>
      isSeriesQuery(args.query as string)
    );
    expect(seriesCalls.length).toBeGreaterThanOrEqual(2);
    for (const [args] of mockEsClient.esql.query.mock.calls) {
      expect((args.query as string).length).toBeLessThan(1_000_000);
    }

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    const { suppressions } = result.data ?? {};
    expect(suppressions?.size).toBe(2);
    expect(
      suppressions?.suppressionReasonFor(
        createAlertEpisode({
          rule_id: `${longSegment}-r0`,
          group_hash: `${longSegment}-g0`,
          episode_id: 'e0',
        })
      )
    ).toBe('snooze');
    expect(
      suppressions?.suppressionReasonFor(
        createAlertEpisode({
          rule_id: `${longSegment}-r199`,
          group_hash: `${longSegment}-g199`,
          episode_id: 'e199',
        })
      )
    ).toBeUndefined();
  });
});
