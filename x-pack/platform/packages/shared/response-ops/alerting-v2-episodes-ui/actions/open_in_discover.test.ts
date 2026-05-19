/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { createOpenInDiscoverAction } from './open_in_discover';
import type { AlertEpisode } from '../queries/episodes_query';

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
