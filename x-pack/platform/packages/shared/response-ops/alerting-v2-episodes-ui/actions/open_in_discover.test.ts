/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import type { AlertEpisode } from '../queries/episodes_query';
import type { EpisodeDiscoverExtension } from '../types/episode_data_source';
import type {
  AlertDiscoverTarget,
  DataViewDiscoverLocatorParams,
} from '../utils/discover_href_for_alert';
import { createOpenInDiscoverAction, OPEN_IN_DISCOVER_EPISODE_ACTION_ID } from './open_in_discover';
import { OPEN_IN_DISCOVER_ERROR, OPEN_IN_DISCOVER_UNAVAILABLE } from './translations';

const makeEpisode = (overrides: Partial<AlertEpisode> = {}): AlertEpisode => ({
  '@timestamp': '2026-04-23T00:00:00Z',
  'episode.id': 'e1',
  'episode.status': 'active' as any,
  'rule.id': 'r1',
  group_hash: 'g1',
  first_timestamp: '2026-04-23T00:00:00Z',
  last_timestamp: '2026-04-23T00:00:00Z',
  duration: 0,
  ...overrides,
});

const makeDeps = () => ({
  application: applicationServiceMock.createStartContract(),
  http: httpServiceMock.createStartContract(),
  notifications: notificationServiceMock.createStartContract(),
  isRuleAvailable: jest.fn(() => true),
  getDiscoverHref: jest.fn<
    string | undefined | Promise<string | undefined>,
    [{ episodeIsoTimestamp: string; ruleId: string }]
  >((_args) => '/discover?query=...'),
});

describe('createOpenInDiscoverAction', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('compatible when episodes.length === 1', () => {
    expect(createOpenInDiscoverAction(makeDeps()).isCompatible({ episodes: [makeEpisode()] })).toBe(
      true
    );
  });

  it('not compatible on empty selection', () => {
    expect(createOpenInDiscoverAction(makeDeps()).isCompatible({ episodes: [] })).toBe(false);
  });

  it('not compatible on multi-selection', () => {
    expect(
      createOpenInDiscoverAction(makeDeps()).isCompatible({
        episodes: [makeEpisode(), makeEpisode({ 'episode.id': 'e2' })],
      })
    ).toBe(false);
  });

  it('not compatible when the episode has no rule id', () => {
    expect(
      createOpenInDiscoverAction(makeDeps()).isCompatible({
        episodes: [makeEpisode({ 'rule.id': undefined })],
      })
    ).toBe(false);
  });

  it('not compatible when the rule is unavailable', () => {
    const deps = makeDeps();
    deps.isRuleAvailable.mockReturnValue(false);

    expect(createOpenInDiscoverAction(deps).isCompatible({ episodes: [makeEpisode()] })).toBe(
      false
    );
    expect(deps.isRuleAvailable).toHaveBeenCalledWith('r1');
  });

  it('execute: calls getDiscoverHref with episode timestamp and rule id, then navigateToUrl', async () => {
    const deps = makeDeps();
    await createOpenInDiscoverAction(deps).execute({ episodes: [makeEpisode()] });
    expect(deps.getDiscoverHref).toHaveBeenCalledWith({
      episodeIsoTimestamp: '2026-04-23T00:00:00Z',
      ruleId: 'r1',
    });
    expect(deps.application.navigateToUrl).toHaveBeenCalledWith('/discover?query=...');
  });

  it('execute: does not call navigateToUrl when getDiscoverHref returns undefined', async () => {
    const deps = makeDeps();
    deps.getDiscoverHref.mockReturnValue(undefined);
    await createOpenInDiscoverAction(deps).execute({ episodes: [makeEpisode()] });
    expect(deps.application.navigateToUrl).not.toHaveBeenCalled();
  });

  it('execute: works when getDiscoverHref returns a Promise', async () => {
    const deps = makeDeps();
    deps.getDiscoverHref.mockResolvedValue('/discover?async=true');
    await createOpenInDiscoverAction(deps).execute({ episodes: [makeEpisode()] });
    expect(deps.application.navigateToUrl).toHaveBeenCalledWith('/discover?async=true');
  });
});

describe('createOpenInDiscoverAction for source rows', () => {
  const LOCATOR_URL = '/app/r?l=DISCOVER_APP_LOCATOR';
  const DATA_VIEW_SPEC = { title: 'logs-*', timeFieldName: '@timestamp' };

  const makeSourceEpisode = (): AlertEpisode =>
    makeEpisode({
      first_timestamp: '2026-11-20T10:00:00.000Z',
      supports_actions: false,
      source_id: 'v1',
      source_action_context: { alertUuid: 'alert-1' },
    });

  const makeSourceDeps = () => {
    const discoverLocator = sharePluginMock.createLocator<DataViewDiscoverLocatorParams>();
    discoverLocator.getRedirectUrl.mockReturnValue(LOCATOR_URL);
    const extension = {
      actionId: OPEN_IN_DISCOVER_EPISODE_ACTION_ID,
      isCompatible: jest.fn(() => true),
      getDiscoverTarget: jest.fn<Promise<AlertDiscoverTarget | undefined>, []>(),
    } satisfies EpisodeDiscoverExtension;

    return {
      ...makeDeps(),
      discoverLocator,
      extension,
    };
  };

  beforeEach(() => jest.clearAllMocks());

  it('keeps native rows on the rule Discover link when a source extension is attached', async () => {
    const deps = makeSourceDeps();
    const action = createOpenInDiscoverAction(deps);

    expect(action.isCompatible({ episodes: [makeEpisode()] })).toBe(true);
    await action.execute({ episodes: [makeEpisode()] });

    expect(deps.isRuleAvailable).toHaveBeenCalledWith('r1');
    expect(deps.getDiscoverHref).toHaveBeenCalledWith({
      episodeIsoTimestamp: '2026-04-23T00:00:00Z',
      ruleId: 'r1',
    });
    expect(deps.application.navigateToUrl).toHaveBeenCalledWith('/discover?query=...');
    expect(deps.extension.isCompatible).not.toHaveBeenCalled();
    expect(deps.extension.getDiscoverTarget).not.toHaveBeenCalled();
  });

  describe('isCompatible', () => {
    it('is compatible when the source extension is compatible with the row', () => {
      const deps = makeSourceDeps();
      const episode = makeSourceEpisode();

      expect(createOpenInDiscoverAction(deps).isCompatible({ episodes: [episode] })).toBe(true);
      expect(deps.extension.isCompatible).toHaveBeenCalledWith(episode);
      expect(deps.isRuleAvailable).not.toHaveBeenCalled();
    });

    it('is not compatible when the source extension is not compatible with the row', () => {
      const deps = makeSourceDeps();
      deps.extension.isCompatible.mockReturnValue(false);

      expect(
        createOpenInDiscoverAction(deps).isCompatible({ episodes: [makeSourceEpisode()] })
      ).toBe(false);
    });

    it('is not compatible when the source has no Discover extension', () => {
      expect(
        createOpenInDiscoverAction({ ...makeSourceDeps(), extension: undefined }).isCompatible({
          episodes: [makeSourceEpisode()],
        })
      ).toBe(false);
    });

    it('is not compatible when the user cannot open Discover', () => {
      expect(
        createOpenInDiscoverAction({
          ...makeSourceDeps(),
          discoverLocator: undefined,
        }).isCompatible({ episodes: [makeSourceEpisode()] })
      ).toBe(false);
    });

    it('is not compatible with a multi-selection', () => {
      expect(
        createOpenInDiscoverAction(makeSourceDeps()).isCompatible({
          episodes: [makeSourceEpisode(), makeSourceEpisode()],
        })
      ).toBe(false);
    });
  });

  describe('execute', () => {
    it('opens a data view Discover view around the alert start', async () => {
      const deps = makeSourceDeps();
      const episode = makeSourceEpisode();
      deps.extension.getDiscoverTarget.mockResolvedValue({
        locatorParams: { dataViewSpec: DATA_VIEW_SPEC, filters: [] },
      });

      await createOpenInDiscoverAction(deps).execute({ episodes: [episode] });

      expect(deps.extension.getDiscoverTarget).toHaveBeenCalledWith(episode, {
        http: deps.http,
      });
      expect(deps.discoverLocator.getRedirectUrl).toHaveBeenCalledWith({
        dataViewSpec: DATA_VIEW_SPEC,
        filters: [],
        timeRange: { from: '2026-11-20T09:45:00.000Z', to: '2026-11-20T10:15:00.000Z' },
      });
      expect(deps.application.navigateToUrl).toHaveBeenCalledWith(LOCATOR_URL);
      expect(deps.getDiscoverHref).not.toHaveBeenCalled();
    });

    it('keeps the time range the source target provides', async () => {
      const deps = makeSourceDeps();
      const timeRange = { from: '2026-11-20T09:00:00.000Z', to: '2026-11-20T10:05:00.000Z' };
      deps.extension.getDiscoverTarget.mockResolvedValue({
        locatorParams: { dataViewSpec: DATA_VIEW_SPEC, filters: [], timeRange },
      });

      await createOpenInDiscoverAction(deps).execute({ episodes: [makeSourceEpisode()] });

      expect(deps.discoverLocator.getRedirectUrl).toHaveBeenCalledWith(
        expect.objectContaining({ timeRange })
      );
    });

    it('opens a link stored on the alert without building a new one', async () => {
      const deps = makeSourceDeps();
      deps.extension.getDiscoverTarget.mockResolvedValue({ url: '/s/default/app/r?l=STORED' });

      await createOpenInDiscoverAction(deps).execute({ episodes: [makeSourceEpisode()] });

      expect(deps.discoverLocator.getRedirectUrl).not.toHaveBeenCalled();
      expect(deps.application.navigateToUrl).toHaveBeenCalledWith('/s/default/app/r?l=STORED');
    });

    it('shows a warning when the alert has no Discover target', async () => {
      const deps = makeSourceDeps();
      deps.extension.getDiscoverTarget.mockResolvedValue(undefined);

      await createOpenInDiscoverAction(deps).execute({ episodes: [makeSourceEpisode()] });

      expect(deps.notifications.toasts.addWarning).toHaveBeenCalledWith(
        OPEN_IN_DISCOVER_UNAVAILABLE
      );
      expect(deps.notifications.toasts.addDanger).not.toHaveBeenCalled();
      expect(deps.application.navigateToUrl).not.toHaveBeenCalled();
    });

    it('shows the underlying error when the target cannot be resolved', async () => {
      const deps = makeSourceDeps();
      deps.extension.getDiscoverTarget.mockRejectedValue(
        new Error('Classic alert not found: alert-1')
      );

      await createOpenInDiscoverAction(deps).execute({ episodes: [makeSourceEpisode()] });

      expect(deps.notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: OPEN_IN_DISCOVER_ERROR,
        text: 'Classic alert not found: alert-1',
      });
      expect(deps.notifications.toasts.addWarning).not.toHaveBeenCalled();
      expect(deps.application.navigateToUrl).not.toHaveBeenCalled();
    });
  });
});
