/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { createViewDetailsAction } from './view_details';
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
  getEpisodeDetailsHref: jest.fn((id: string) => `/episodes/${id}`),
});

describe('createViewDetailsAction', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('compatible when single episode with id', () => {
    expect(createViewDetailsAction(makeDeps()).isCompatible({ episodes: [makeEpisode()] })).toBe(
      true
    );
  });

  it('not compatible on empty selection', () => {
    expect(createViewDetailsAction(makeDeps()).isCompatible({ episodes: [] })).toBe(false);
  });

  it('not compatible on multi-selection', () => {
    expect(
      createViewDetailsAction(makeDeps()).isCompatible({
        episodes: [makeEpisode(), makeEpisode({ 'episode.id': 'e2' })],
      })
    ).toBe(false);
  });

  it('not compatible when episode.id is empty string', () => {
    expect(
      createViewDetailsAction(makeDeps()).isCompatible({
        episodes: [makeEpisode({ 'episode.id': '' })],
      })
    ).toBe(false);
  });

  it('execute: calls getEpisodeDetailsHref with episode id then navigateToUrl', async () => {
    const deps = makeDeps();
    await createViewDetailsAction(deps).execute({ episodes: [makeEpisode()] });
    expect(deps.getEpisodeDetailsHref).toHaveBeenCalledWith('e1');
    expect(deps.application.navigateToUrl).toHaveBeenCalledWith('/episodes/e1');
  });
});
