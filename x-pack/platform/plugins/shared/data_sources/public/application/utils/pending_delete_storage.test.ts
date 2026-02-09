/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  savePendingBulkDelete,
  getPendingBulkDelete,
  getPendingDeleteIds,
  getPendingDeleteTaskId,
  clearPendingBulkDelete,
  STORAGE_KEY,
} from './pending_delete_storage';

describe('pending_delete_storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('savePendingBulkDelete', () => {
    it('should save ids to sessionStorage', () => {
      savePendingBulkDelete({ ids: ['ds-1', 'ds-2'] });

      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!);
      expect(stored).toEqual({
        taskId: '',
        ids: ['ds-1', 'ds-2'],
      });
    });

    it('should save taskId to sessionStorage', () => {
      savePendingBulkDelete({ taskId: 'task-123' });

      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!);
      expect(stored).toEqual({
        taskId: 'task-123',
        ids: [],
      });
    });

    it('should save both ids and taskId at once', () => {
      savePendingBulkDelete({ taskId: 'task-456', ids: ['ds-a', 'ds-b'] });

      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!);
      expect(stored).toEqual({
        taskId: 'task-456',
        ids: ['ds-a', 'ds-b'],
      });
    });

    it('should silently handle sessionStorage errors', () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('sessionStorage not available');
      });

      expect(() => savePendingBulkDelete({ ids: ['ds-1'] })).not.toThrow();

      setItemSpy.mockRestore();
    });
  });

  describe('getPendingBulkDelete', () => {
    it('should return null when nothing is stored', () => {
      expect(getPendingBulkDelete()).toBeNull();
    });

    it('should return stored data', () => {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ taskId: 'task-1', ids: ['ds-1'] }));

      expect(getPendingBulkDelete()).toEqual({
        taskId: 'task-1',
        ids: ['ds-1'],
      });
    });

    it('should return null when stored data is invalid JSON', () => {
      sessionStorage.setItem(STORAGE_KEY, 'not-valid-json');

      expect(getPendingBulkDelete()).toBeNull();
    });

    it('should silently handle sessionStorage errors', () => {
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('sessionStorage not available');
      });

      expect(getPendingBulkDelete()).toBeNull();

      getItemSpy.mockRestore();
    });
  });

  describe('getPendingDeleteIds', () => {
    it('should return empty Set when nothing is stored', () => {
      const result = getPendingDeleteIds();

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('should return Set of stored ids', () => {
      savePendingBulkDelete({ ids: ['ds-1', 'ds-2', 'ds-3'] });

      const result = getPendingDeleteIds();

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(3);
      expect(result.has('ds-1')).toBe(true);
      expect(result.has('ds-2')).toBe(true);
      expect(result.has('ds-3')).toBe(true);
    });

    it('should return empty Set when stored data has no ids', () => {
      savePendingBulkDelete({ taskId: 'task-1' });

      // ids defaults to [] when only taskId is saved
      const result = getPendingDeleteIds();
      expect(result.size).toBe(0);
    });
  });

  describe('getPendingDeleteTaskId', () => {
    it('should return null when nothing is stored', () => {
      expect(getPendingDeleteTaskId()).toBeNull();
    });

    it('should return stored taskId', () => {
      savePendingBulkDelete({ taskId: 'task-abc' });

      expect(getPendingDeleteTaskId()).toBe('task-abc');
    });

    it('should return null when taskId is empty string', () => {
      savePendingBulkDelete({ ids: ['ds-1'] });

      // taskId defaults to '' when only ids are saved
      expect(getPendingDeleteTaskId()).toBeNull();
    });
  });

  describe('clearPendingBulkDelete', () => {
    it('should remove stored data from sessionStorage', () => {
      savePendingBulkDelete({ taskId: 'task-1', ids: ['ds-1'] });

      clearPendingBulkDelete();

      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should not throw when nothing is stored', () => {
      expect(() => clearPendingBulkDelete()).not.toThrow();
    });

    it('should silently handle sessionStorage errors', () => {
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('sessionStorage not available');
      });

      expect(() => clearPendingBulkDelete()).not.toThrow();

      removeItemSpy.mockRestore();
    });
  });
});
