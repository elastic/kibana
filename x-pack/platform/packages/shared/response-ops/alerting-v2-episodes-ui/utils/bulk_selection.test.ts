/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEpisodesFromDocIds, uniqueGroupEpisodes } from './bulk_selection';
import type { AlertEpisode } from '../queries/episodes_query';

const ep = (id: string, groupHash: string): AlertEpisode =>
  ({ 'episode.id': id, group_hash: groupHash } as AlertEpisode);

describe('getEpisodesFromDocIds', () => {
  const data = [ep('ep1', 'gh1'), ep('ep2', 'gh2'), ep('ep3', 'gh1')];

  it('returns the episodes whose episode.id matches the selection', () => {
    expect(getEpisodesFromDocIds(['ep1', 'ep3'], data)).toEqual([data[0], data[2]]);
  });

  it('returns all episodes when every episode.id is selected', () => {
    expect(getEpisodesFromDocIds(['ep1', 'ep2', 'ep3'], data)).toEqual(data);
  });

  it('preserves the data order regardless of the order of selectedDocIds', () => {
    expect(getEpisodesFromDocIds(['ep3', 'ep1'], data)).toEqual([data[0], data[2]]);
  });

  it('filters out unknown ids', () => {
    expect(getEpisodesFromDocIds(['nope'], data)).toEqual([]);
  });

  it('returns empty array for empty selection', () => {
    expect(getEpisodesFromDocIds([], data)).toEqual([]);
  });
});

describe('uniqueGroupEpisodes', () => {
  it('deduplicates episodes by group_hash, keeping the first occurrence', () => {
    const episodes = [ep('ep1', 'gh1'), ep('ep2', 'gh2'), ep('ep3', 'gh1')];
    expect(uniqueGroupEpisodes(episodes)).toEqual([ep('ep1', 'gh1'), ep('ep2', 'gh2')]);
  });

  it('returns all episodes when all group_hashes are distinct', () => {
    const episodes = [ep('ep1', 'gh1'), ep('ep2', 'gh2'), ep('ep3', 'gh3')];
    expect(uniqueGroupEpisodes(episodes)).toEqual(episodes);
  });

  it('filters out episodes with a falsy group_hash', () => {
    const episodes = [{ 'episode.id': 'ep1', group_hash: '' } as AlertEpisode, ep('ep2', 'gh2')];
    expect(uniqueGroupEpisodes(episodes)).toEqual([ep('ep2', 'gh2')]);
  });

  it('returns empty array for empty input', () => {
    expect(uniqueGroupEpisodes([])).toEqual([]);
  });
});
