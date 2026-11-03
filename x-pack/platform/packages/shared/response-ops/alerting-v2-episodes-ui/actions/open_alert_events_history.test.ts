/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asSpaceId } from '@kbn/core-spaces-common';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import type { AlertEpisode } from '../queries/episodes_query';
import { createOpenAlertEventsHistoryAction } from './open_alert_events_history';

const makeEpisode = (overrides: Partial<AlertEpisode> = {}): AlertEpisode =>
  ({
    '@timestamp': '2026-04-23T01:00:00Z',
    'episode.id': 'e1',
    'episode.status': 'active',
    'rule.id': 'r1',
    group_hash: 'g1',
    first_timestamp: '2026-04-23T00:00:00Z',
    last_timestamp: '2026-04-23T01:00:00Z',
    duration: 3_600_000,
    ...overrides,
  } as AlertEpisode);

const makeDeps = () => {
  const spaces = spacesPluginMock.createStartContract();
  spaces.getActiveSpace.mockResolvedValue({
    id: asSpaceId('space-one'),
    name: 'Space one',
    disabledFeatures: [],
  });

  return {
    spaces,
    isAvailable: jest.fn(() => true),
    getAlertEventsHistoryHref: jest.fn((): string | undefined => '/discover?query=history'),
  };
};

describe('createOpenAlertEventsHistoryAction', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('is compatible with a single native episode', () => {
    expect(
      createOpenAlertEventsHistoryAction(makeDeps()).isCompatible({ episodes: [makeEpisode()] })
    ).toBe(true);
  });

  it('stays visible but disabled when Discover cannot open the history', () => {
    const deps = makeDeps();
    deps.isAvailable.mockReturnValue(false);
    const action = createOpenAlertEventsHistoryAction(deps);
    const episodes = [makeEpisode()];

    expect(action.isCompatible({ episodes })).toBe(false);
    expect(action.showWhenDisabled?.({ episodes })).toBe(true);
    expect(action.disabledTooltip).toBe(
      'Discover with ES|QL is required to open alert events history.'
    );
  });

  it('is not compatible with multiple or source episodes', () => {
    const action = createOpenAlertEventsHistoryAction(makeDeps());
    const multiple = [makeEpisode(), makeEpisode()];
    const source = [makeEpisode({ supports_timeline: false })];

    expect(action.isCompatible({ episodes: multiple })).toBe(false);
    expect(action.showWhenDisabled?.({ episodes: multiple })).toBe(false);
    expect(action.isCompatible({ episodes: source })).toBe(false);
    expect(action.showWhenDisabled?.({ episodes: source })).toBe(false);
  });

  it('opens Discover with the episode history query', async () => {
    const deps = makeDeps();
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    await createOpenAlertEventsHistoryAction(deps).execute({ episodes: [makeEpisode()] });

    expect(deps.getAlertEventsHistoryHref).toHaveBeenCalledWith({
      episodeId: 'e1',
      episodeStart: '2026-04-23T00:00:00Z',
      spaceId: 'space-one',
    });
    expect(openSpy).toHaveBeenCalledWith(
      '/discover?query=history',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('does not navigate when no Discover URL is available', async () => {
    const deps = makeDeps();
    deps.getAlertEventsHistoryHref.mockReturnValue(undefined);
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    await createOpenAlertEventsHistoryAction(deps).execute({ episodes: [makeEpisode()] });

    expect(openSpy).not.toHaveBeenCalled();
  });
});
