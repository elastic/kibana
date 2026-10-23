/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-browser-mocks';
import { QueryClient } from '@kbn/react-query';
import { createSnoozeAction } from './snooze';
import * as modal from '../components/snooze_modal';
import * as bulk from './bulk_create_alert_actions';
import type { AlertEpisode as BaseAlertEpisode } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '../queries/episodes_query';
import type { EpisodeActionExtension } from '../types/episode_data_source';
import type { EpisodeSnoozePayload } from '../components/snooze_modal';
import { CONDITIONAL_SNOOZE_UNSUPPORTED } from './translations';

const makeEpisode = (overrides: Partial<AlertEpisode> = {}): BaseAlertEpisode => ({
  '@timestamp': '2026-04-23T00:00:00Z',
  'episode.id': 'e1',
  'episode.status': 'active' as any,
  'rule.id': 'r1',
  group_hash: 'g1',
  series_id: 's1',
  first_timestamp: '2026-04-23T00:00:00Z',
  last_timestamp: '2026-04-23T00:00:00Z',
  duration: 0,
  ...overrides,
});

const makeSourceEpisode = (overrides: Partial<AlertEpisode> = {}): BaseAlertEpisode =>
  makeEpisode({ source_id: 'classic-alerts', ...overrides });

const makeDeps = (
  additionalDataSource?: Parameters<typeof createSnoozeAction>[0]['additionalDataSource']
) => ({
  http: httpServiceMock.createStartContract(),
  overlays: overlayServiceMock.createStartContract(),
  notifications: notificationServiceMock.createStartContract(),
  rendering: renderingServiceMock.create(),
  queryClient: new QueryClient(),
  additionalDataSource,
});

const makeExtension = (): EpisodeActionExtension<EpisodeSnoozePayload> => ({
  actionId: 'ALERTING_V2_SNOOZE_EPISODE',
  isCompatible: () => true,
  execute: jest.fn().mockResolvedValue({ succeeded: 1, failed: 0 }),
});

const mockModal = (payload: EpisodeSnoozePayload | undefined) =>
  jest.spyOn(modal, 'openSnoozeModal').mockResolvedValue(payload);

describe('createSnoozeAction', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('compatible when at least one episode is not snoozed', () => {
    expect(
      createSnoozeAction(makeDeps()).isCompatible({
        episodes: [makeEpisode({ last_snooze_action: 'unsnooze' })],
      })
    ).toBe(true);
  });

  it('not compatible when every episode is already snoozed', () => {
    expect(
      createSnoozeAction(makeDeps()).isCompatible({
        episodes: [makeEpisode({ last_snooze_action: 'snooze' })],
      })
    ).toBe(false);
  });

  it('compatible when snooze has expired', () => {
    expect(
      createSnoozeAction(makeDeps()).isCompatible({
        episodes: [
          makeEpisode({
            last_snooze_action: 'snooze',
            snoozed_until: '2020-01-01T00:00:00.000Z',
          }),
        ],
      })
    ).toBe(true);
  });

  it('not compatible on empty selection', () => {
    expect(createSnoozeAction(makeDeps()).isCompatible({ episodes: [] })).toBe(false);
  });

  it('not compatible when the episode has no series_id', () => {
    expect(
      createSnoozeAction(makeDeps()).isCompatible({
        episodes: [makeEpisode({ series_id: null })],
      })
    ).toBe(false);
  });

  it('execute: opens modal, POSTs unique-by-series SNOOZE items, toasts, calls onSuccess', async () => {
    const deps = makeDeps();
    mockModal({ snoozedUntil: '2026-05-01T00:00:00Z' });
    jest
      .spyOn(bulk, 'bulkSnoozeSeriesActions')
      .mockResolvedValue({ affected_count: 1, errors: [] });
    const onSuccess = jest.fn();
    await createSnoozeAction(deps).execute({
      episodes: [makeEpisode(), makeEpisode({ 'episode.id': 'e2' })],
      onSuccess,
    });
    expect(bulk.bulkSnoozeSeriesActions).toHaveBeenCalledWith(deps.http, [
      { series_id: 's1', snoozed_until: '2026-05-01T00:00:00Z' },
    ]);
    expect(deps.notifications.toasts.add).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('execute: snoozes the series of every rule when episodes of two rules share a group_hash', async () => {
    const deps = makeDeps();
    mockModal({ snoozedUntil: '2026-05-01T00:00:00Z' });
    jest
      .spyOn(bulk, 'bulkSnoozeSeriesActions')
      .mockResolvedValue({ affected_count: 2, errors: [] });
    await createSnoozeAction(deps).execute({
      episodes: [
        makeEpisode({ 'rule.id': 'r1', series_id: 's-r1', group_hash: 'shared' }),
        makeEpisode({
          'episode.id': 'e2',
          'rule.id': 'r2',
          series_id: 's-r2',
          group_hash: 'shared',
        }),
      ],
    });
    expect(bulk.bulkSnoozeSeriesActions).toHaveBeenCalledWith(deps.http, [
      { series_id: 's-r1', snoozed_until: '2026-05-01T00:00:00Z' },
      { series_id: 's-r2', snoozed_until: '2026-05-01T00:00:00Z' },
    ]);
  });

  it('execute: cancelled modal is a no-op', async () => {
    const deps = makeDeps();
    mockModal(undefined);
    const onSuccess = jest.fn();
    await createSnoozeAction(deps).execute({ episodes: [makeEpisode()], onSuccess });
    expect(deps.http.post).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('execute: error path calls notifications.toasts.addError', async () => {
    const deps = makeDeps();
    mockModal({ snoozedUntil: '2026-05-01T00:00:00Z' });
    jest.spyOn(bulk, 'bulkSnoozeSeriesActions').mockRejectedValue(new Error('network error'));
    const onSuccess = jest.fn();

    await createSnoozeAction(deps).execute({ episodes: [makeEpisode()], onSuccess });

    expect(deps.notifications.toasts.addError).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  describe('condition based snooze availability', () => {
    const conditionalSource = { id: 'classic-alerts', supportsConditionalSnooze: true };

    beforeEach(() => {
      jest
        .spyOn(bulk, 'bulkSnoozeSeriesActions')
        .mockResolvedValue({ affected_count: 1, errors: [] });
    });

    it('enables the conditional tab when every row comes from a source that supports conditions', async () => {
      const deps = makeDeps(conditionalSource);
      const open = mockModal({ snoozedUntil: null });

      await createSnoozeAction(deps, makeExtension()).execute({
        episodes: [makeSourceEpisode(), makeSourceEpisode({ 'episode.id': 'e2' })],
      });

      expect(open).toHaveBeenCalledWith(
        deps,
        expect.objectContaining({
          dataSource: conditionalSource,
          conditionalTabDisabledReason: undefined,
        })
      );
    });

    it('disables the conditional tab for a mixed classic and universal selection', async () => {
      const deps = makeDeps(conditionalSource);
      const open = mockModal({ snoozedUntil: null });

      await createSnoozeAction(deps, makeExtension()).execute({
        episodes: [makeSourceEpisode(), makeEpisode({ 'episode.id': 'e2' })],
      });

      expect(open).toHaveBeenCalledWith(
        deps,
        expect.objectContaining({ conditionalTabDisabledReason: CONDITIONAL_SNOOZE_UNSUPPORTED })
      );
    });

    it('disables the conditional tab for a universal-only selection', async () => {
      const deps = makeDeps(conditionalSource);
      const open = mockModal({ snoozedUntil: null });

      await createSnoozeAction(deps, makeExtension()).execute({ episodes: [makeEpisode()] });

      expect(open).toHaveBeenCalledWith(
        deps,
        expect.objectContaining({ conditionalTabDisabledReason: CONDITIONAL_SNOOZE_UNSUPPORTED })
      );
    });

    it('disables the conditional tab when the source does not support conditions', async () => {
      const deps = makeDeps({ id: 'other-source' });
      const open = mockModal({ snoozedUntil: null });

      await createSnoozeAction(deps, makeExtension()).execute({
        episodes: [makeSourceEpisode()],
      });

      expect(open).toHaveBeenCalledWith(
        deps,
        expect.objectContaining({ conditionalTabDisabledReason: CONDITIONAL_SNOOZE_UNSUPPORTED })
      );
    });

    it('forwards the conditions to the source extension', async () => {
      const deps = makeDeps(conditionalSource);
      const extension = makeExtension();
      const payload: EpisodeSnoozePayload = {
        snoozedUntil: null,
        conditions: [{ type: 'severity_change' }],
        conditionOperator: 'any',
      };
      mockModal(payload);

      const episodes = [makeSourceEpisode()];
      await createSnoozeAction(deps, extension).execute({ episodes });

      expect(extension.execute).toHaveBeenCalledWith(episodes, deps.http, payload);
    });

    it('never sends conditions down the native path', async () => {
      const deps = makeDeps(conditionalSource);
      mockModal({
        snoozedUntil: '2026-05-01T00:00:00Z',
        conditions: [{ type: 'severity_change' }],
        conditionOperator: 'any',
      });

      await createSnoozeAction(deps, makeExtension()).execute({ episodes: [makeEpisode()] });

      expect(bulk.bulkSnoozeSeriesActions).toHaveBeenCalledWith(deps.http, [
        { series_id: 's1', snoozed_until: '2026-05-01T00:00:00Z' },
      ]);
    });

    it('scopes the condition fields to the rule types of the selected source rows', async () => {
      const getRuleTypeIds = jest.fn().mockReturnValue(['observability.rules.custom_threshold']);
      const deps = makeDeps({ ...conditionalSource, getRuleTypeIds });
      const open = mockModal({ snoozedUntil: null });

      const sourceEpisode = makeSourceEpisode();
      await createSnoozeAction(deps, makeExtension()).execute({
        episodes: [sourceEpisode, makeEpisode({ 'episode.id': 'e2' })],
      });

      // Native rows have no source context to read a rule type from.
      expect(getRuleTypeIds).toHaveBeenCalledWith([sourceEpisode]);
      expect(open).toHaveBeenCalledWith(
        deps,
        expect.objectContaining({ ruleTypeIds: ['observability.rules.custom_threshold'] })
      );
    });
  });
});
