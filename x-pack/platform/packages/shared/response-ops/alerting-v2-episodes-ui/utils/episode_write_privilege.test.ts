/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeAction } from '../actions';
import type { AlertEpisode } from '../queries/episodes_query';
import { withEpisodeWritePrivilege } from './episode_write_privilege';

const writable = { 'episode.id': 'writable' } as AlertEpisode;
const readOnly = { 'episode.id': 'read-only' } as AlertEpisode;

const canWriteEpisode = (episode: AlertEpisode) => episode === writable;

const makeAction = (overrides: Partial<EpisodeAction> = {}): EpisodeAction => ({
  id: 'ALERTING_V2_ACK_EPISODE',
  order: 10,
  displayName: 'Acknowledge',
  iconType: 'checkCircle',
  enforcesOwnPrivileges: false,
  isCompatible: ({ episodes }) => episodes.length > 0,
  execute: jest.fn(async () => {}),
  ...overrides,
});

describe('withEpisodeWritePrivilege', () => {
  it('returns actions that enforce their own privileges untouched', () => {
    const action = makeAction({ enforcesOwnPrivileges: true });

    expect(withEpisodeWritePrivilege(action, canWriteEpisode)).toBe(action);
  });

  it('reports the action incompatible when no selected episode is writable', () => {
    const gated = withEpisodeWritePrivilege(makeAction(), canWriteEpisode);

    expect(gated.isCompatible({ episodes: [readOnly] })).toBe(false);
    expect(gated.isCompatible({ episodes: [writable] })).toBe(true);
  });

  it('executes on the writable episodes only', async () => {
    const action = makeAction();
    const gated = withEpisodeWritePrivilege(action, canWriteEpisode);

    await gated.execute({ episodes: [writable, readOnly] });

    expect(action.execute).toHaveBeenCalledWith(expect.objectContaining({ episodes: [writable] }));
  });

  it('skips the execution entirely when nothing in the selection is writable', async () => {
    const action = makeAction();
    const gated = withEpisodeWritePrivilege(action, canWriteEpisode);

    await gated.execute({ episodes: [readOnly] });

    expect(action.execute).not.toHaveBeenCalled();
  });

  it('keeps the action hidden rather than disabled on read-only episodes', () => {
    const action = makeAction({ showWhenDisabled: ({ episodes }) => episodes.length > 0 });
    const gated = withEpisodeWritePrivilege(action, canWriteEpisode);

    expect(gated.showWhenDisabled?.({ episodes: [readOnly] })).toBe(false);
    expect(gated.showWhenDisabled?.({ episodes: [writable] })).toBe(true);
  });

  it('reports a bulk disabled reason for the writable part of the selection', () => {
    const action = makeAction({
      getBulkDisabledReason: (episodes) => (episodes.length > 1 ? 'Too many' : undefined),
    });
    const gated = withEpisodeWritePrivilege(action, canWriteEpisode);

    expect(gated.getBulkDisabledReason?.([writable, readOnly])).toBeUndefined();
    expect(gated.getBulkDisabledReason?.([readOnly])).toBeUndefined();
    expect(gated.getBulkDisabledReason?.([writable, writable])).toBe('Too many');
  });

  it('renders its own surfaces with the writable episodes only', () => {
    const renderMenuItem = jest.fn(() => null);
    const renderInlineControl = jest.fn(() => null);
    const gated = withEpisodeWritePrivilege(
      makeAction({ renderMenuItem, renderInlineControl }),
      canWriteEpisode
    );

    gated.renderMenuItem?.({ episodes: [writable, readOnly] });
    gated.renderInlineControl?.({ episodes: [writable, readOnly] });

    expect(renderMenuItem).toHaveBeenCalledWith(expect.objectContaining({ episodes: [writable] }));
    expect(renderInlineControl).toHaveBeenCalledWith(
      expect.objectContaining({ episodes: [writable] })
    );
  });

  it('leaves the optional surfaces unset when the action does not implement them', () => {
    const gated = withEpisodeWritePrivilege(makeAction(), canWriteEpisode);

    expect(gated.renderMenuItem).toBeUndefined();
    expect(gated.renderInlineControl).toBeUndefined();
    expect(gated.showWhenDisabled).toBeUndefined();
    expect(gated.getBulkDisabledReason).toBeUndefined();
  });
});
