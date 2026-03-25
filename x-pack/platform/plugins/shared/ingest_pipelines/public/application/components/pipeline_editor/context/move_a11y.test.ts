/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../components/shared', () => ({
  getProcessorDescriptor: () => undefined,
}));

import { applyPendingMoveA11yEffects, buildMoveAnnouncement } from './move_a11y';

describe('move_a11y', () => {
  let rafSpy: jest.SpyInstance | undefined;
  let cancelRafSpy: jest.SpyInstance | undefined;

  beforeEach(() => {
    document.body.innerHTML = '';

    rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0 as unknown as number;
    });
    cancelRafSpy = jest
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((_handle: number) => {});
  });

  afterEach(() => {
    rafSpy?.mockRestore();
    cancelRafSpy?.mockRestore();
    rafSpy = undefined;
    cancelRafSpy = undefined;
  });

  describe('buildMoveAnnouncement', () => {
    it('builds an announcement that includes scope and destination details', () => {
      const processors = [
        {
          id: 'root',
          type: 'root_type',
          options: {},
          onFailure: [{ id: 'moved', type: 'moved_type', options: {} }],
        },
      ];

      const result = buildMoveAnnouncement({
        source: ['processors', '0', 'onFailure', '0'],
        destination: ['processors', '0'],
        processors,
        onFailureProcessors: [],
      });

      expect(result).toBeDefined();
      const { movedProcessorId, announcement } = result!;
      expect(movedProcessorId).toBe('moved');
      expect(announcement).toContain('moved_type');
      expect(announcement).toContain('Failure handlers');
      expect(announcement).toContain('Processors');
      expect(announcement).toContain('before root_type');
    });
  });

  describe('applyPendingMoveA11yEffects', () => {
    it('restores focus then announces the move', () => {
      const container = document.createElement('div');
      container.setAttribute('data-processor-id', 'moved');
      const moveButton = document.createElement('button');
      moveButton.setAttribute('data-test-subj', 'moveItemButton');
      container.appendChild(moveButton);
      document.body.appendChild(container);

      const pendingFocusProcessorIdRef = { current: 'moved' };
      const pendingMoveAnnouncementRef = { current: 'Moved!' };
      const setMoveAnnouncement = jest.fn(() => {
        expect(document.activeElement).toBe(moveButton);
      });

      const cleanup = applyPendingMoveA11yEffects({
        modeId: 'idle',
        pendingFocusProcessorIdRef,
        pendingMoveAnnouncementRef,
        setMoveAnnouncement,
      });

      expect(setMoveAnnouncement).toHaveBeenCalledWith('Moved!');
      expect(pendingFocusProcessorIdRef.current).toBe(null);
      expect(pendingMoveAnnouncementRef.current).toBe(null);

      cleanup?.();
    });

    it('falls back to a stable focus target when the moved processor cannot be focused', () => {
      const addProcessorButton = document.createElement('button');
      addProcessorButton.setAttribute('data-test-subj', 'addProcessorButton');
      document.body.appendChild(addProcessorButton);

      const pendingFocusProcessorIdRef = { current: 'missing' };
      const pendingMoveAnnouncementRef = { current: 'Moved!' };
      const setMoveAnnouncement = jest.fn(() => {
        expect(document.activeElement).toBe(addProcessorButton);
      });

      const cleanup = applyPendingMoveA11yEffects({
        modeId: 'idle',
        pendingFocusProcessorIdRef,
        pendingMoveAnnouncementRef,
        setMoveAnnouncement,
      });

      expect(setMoveAnnouncement).toHaveBeenCalledWith('Moved!');
      expect(pendingFocusProcessorIdRef.current).toBe(null);
      expect(pendingMoveAnnouncementRef.current).toBe(null);

      cleanup?.();
    });
  });
});
