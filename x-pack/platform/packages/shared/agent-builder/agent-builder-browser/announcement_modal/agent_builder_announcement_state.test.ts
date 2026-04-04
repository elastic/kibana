/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAgentBuilderAnnouncementState } from './agent_builder_announcement_state';

const storageKeyForSpace = (spaceId: string) => `agentBuilder.announcementModal.${spaceId}`;

describe('getAgentBuilderAnnouncementState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns hasSeenModal false when localStorage has no entry for the space', () => {
    const { hasSeenModal } = getAgentBuilderAnnouncementState('default');

    expect(hasSeenModal).toBe(false);
  });

  it('returns hasSeenModal true when localStorage marks the modal seen for that space', () => {
    localStorage.setItem(storageKeyForSpace('default'), 'true');
    const { hasSeenModal } = getAgentBuilderAnnouncementState('default');

    expect(hasSeenModal).toBe(true);
  });

  it('persists seen state per space id', () => {
    localStorage.setItem(storageKeyForSpace('space-a'), 'true');
    const { hasSeenModal } = getAgentBuilderAnnouncementState('space-b');

    expect(hasSeenModal).toBe(false);
  });

  it('markAsSeen writes true for the current space key', () => {
    const { markAsSeen } = getAgentBuilderAnnouncementState('space-x');

    markAsSeen();

    expect(localStorage.getItem(storageKeyForSpace('space-x'))).toBe('true');
  });

  it('returns hasSeenModal true when localStorage getItem throws', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('quota');
    });

    const { hasSeenModal } = getAgentBuilderAnnouncementState('default');

    expect(hasSeenModal).toBe(true);
    getItemSpy.mockRestore();
  });

  it('markAsSeen does not throw when localStorage setItem throws', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    const { markAsSeen } = getAgentBuilderAnnouncementState('default');

    expect(() => markAsSeen()).not.toThrow();
    setItemSpy.mockRestore();
  });
});
