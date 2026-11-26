/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_OBSERVABLES_PER_CASE } from '../../common/constants';
import type { Observable } from '../../common/types/domain';
import { createObservableServiceMock } from '../services/mocks';
import {
  getObservablesPreview,
  getObservablesPreviewAfterWrite,
  getObservablesPreviews,
  getObservablesPreviewsAfterWrite,
  mergeObservablesPreview,
  withObservablesPreview,
  withObservablesPreviewAfterWrite,
} from './observables_preview';

const createObservables = (count: number, prefix: string): Observable[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    typeKey: 'observable-type-ipv4',
    value: `10.0.0.${index}`,
    description: null,
    createdAt: '2026-11-06T09:30:00.000Z',
    updatedAt: null,
  }));

const ids = (observables: Observable[]): string[] => observables.map(({ id }) => id);

describe('observables preview', () => {
  describe('mergeObservablesPreview', () => {
    it('lists the field first, then the oldest objects until 50 are listed', () => {
      const field = createObservables(10, 'field');
      const oldest = createObservables(50, 'type');

      const merged = mergeObservablesPreview(
        { id: 'case-1', observables: field },
        { count: 200, oldest }
      );

      expect(ids(merged.observables)).toEqual([...ids(field), ...ids(oldest.slice(0, 40))]);
    });

    it('counts both stores in the total', () => {
      const merged = mergeObservablesPreview(
        { id: 'case-1', observables: createObservables(10, 'field') },
        { count: 200, oldest: createObservables(40, 'type') }
      );

      expect(merged.total_observables).toBe(210);
    });

    it('keeps the order of the objects the service returned', () => {
      const oldest = createObservables(3, 'type').reverse();

      const merged = mergeObservablesPreview(
        { id: 'case-1', observables: [] },
        { count: 3, oldest }
      );

      expect(ids(merged.observables)).toEqual(['type-2', 'type-1', 'type-0']);
    });

    it('lists every observable of a field that holds more than 50, and none of the type', () => {
      const field = createObservables(MAX_OBSERVABLES_PER_CASE + 10, 'field');

      const merged = mergeObservablesPreview(
        { id: 'case-1', observables: field },
        { count: 5, oldest: [] }
      );

      expect(ids(merged.observables)).toEqual(ids(field));
      expect(merged.total_observables).toBe(MAX_OBSERVABLES_PER_CASE + 15);
    });

    it('lists only the type for a case whose field is empty', () => {
      const oldest = createObservables(MAX_OBSERVABLES_PER_CASE, 'type');

      const merged = mergeObservablesPreview(
        { id: 'case-1', observables: [] },
        { count: 75, oldest }
      );

      expect(ids(merged.observables)).toEqual(ids(oldest));
      expect(merged.total_observables).toBe(75);
    });

    it('lists and counts only the field when the case has no objects of the type', () => {
      const field = createObservables(3, 'field');

      const merged = mergeObservablesPreview({ id: 'case-1', observables: field }, undefined);

      expect(merged.observables).toEqual(field);
      expect(merged.total_observables).toBe(3);
    });

    it('keeps the other fields of the case', () => {
      const merged = mergeObservablesPreview(
        { id: 'case-1', observables: [], title: 'a case', total_observables: 0 },
        { count: 1, oldest: createObservables(1, 'type') }
      );

      expect(merged).toEqual({
        id: 'case-1',
        title: 'a case',
        observables: createObservables(1, 'type'),
        total_observables: 1,
      });
    });
  });

  describe('getObservablesPreviews', () => {
    it('sizes the previews for the case with the most room left in its field', async () => {
      const observableService = createObservableServiceMock();

      await getObservablesPreviews(observableService, [
        { id: 'case-1', observables: createObservables(45, 'a') },
        { id: 'case-2', observables: createObservables(10, 'b') },
      ]);

      expect(observableService.getter.getPreviews).toHaveBeenCalledWith(['case-1', 'case-2'], 40);
    });

    it('asks for counts only when every field holds 50 or more', async () => {
      const observableService = createObservableServiceMock();

      await getObservablesPreviews(observableService, [
        { id: 'case-1', observables: createObservables(MAX_OBSERVABLES_PER_CASE, 'a') },
        { id: 'case-2', observables: createObservables(MAX_OBSERVABLES_PER_CASE + 1, 'b') },
      ]);

      expect(observableService.getter.getPreviews).toHaveBeenCalledWith(['case-1', 'case-2'], 0);
    });

    it('returns the previews the service found', async () => {
      const observableService = createObservableServiceMock();
      const previews = new Map([['case-1', { count: 1, oldest: createObservables(1, 'type') }]]);
      observableService.getter.getPreviews.mockResolvedValue(previews);

      await expect(
        getObservablesPreviews(observableService, [{ id: 'case-1', observables: [] }])
      ).resolves.toBe(previews);
    });
  });

  describe('getObservablesPreview', () => {
    it("returns the case's preview", async () => {
      const observableService = createObservableServiceMock();
      const preview = { count: 1, oldest: createObservables(1, 'type') };
      observableService.getter.getPreviews.mockResolvedValue(new Map([['case-1', preview]]));

      await expect(
        getObservablesPreview(observableService, {
          id: 'case-1',
          observables: createObservables(2, 'field'),
        })
      ).resolves.toBe(preview);
      expect(observableService.getter.getPreviews).toHaveBeenCalledWith(['case-1'], 48);
    });

    it('returns undefined when the case has no objects of the type', async () => {
      const observableService = createObservableServiceMock();

      await expect(
        getObservablesPreview(observableService, { id: 'case-1', observables: [] })
      ).resolves.toBeUndefined();
    });
  });

  describe('withObservablesPreview', () => {
    it('adds the preview and the total to one case', async () => {
      const observableService = createObservableServiceMock();
      const field = createObservables(2, 'field');
      const oldest = createObservables(3, 'type');
      observableService.getter.getPreviews.mockResolvedValue(
        new Map([['case-1', { count: 3, oldest }]])
      );

      const merged = await withObservablesPreview(observableService, {
        id: 'case-1',
        observables: field,
      });

      expect(observableService.getter.getPreviews).toHaveBeenCalledWith(['case-1'], 48);
      expect(ids(merged.observables)).toEqual([...ids(field), ...ids(oldest)]);
      expect(merged.total_observables).toBe(5);
    });

    it('fails when the preview fails', async () => {
      const observableService = createObservableServiceMock();
      observableService.getter.getPreviews.mockRejectedValue(new Error('search failed'));

      await expect(
        withObservablesPreview(observableService, { id: 'case-1', observables: [] })
      ).rejects.toThrow('search failed');
    });
  });

  describe('after a write', () => {
    const field = createObservables(2, 'field');
    const oldest = createObservables(3, 'type');

    it('getObservablesPreviewsAfterWrite returns the previews the service found', async () => {
      const observableService = createObservableServiceMock();
      const previews = new Map([['case-1', { count: 3, oldest }]]);
      observableService.getter.getPreviews.mockResolvedValue(previews);

      await expect(
        getObservablesPreviewsAfterWrite(observableService, [{ id: 'case-1', observables: field }])
      ).resolves.toBe(previews);
      expect(observableService.getter.getPreviews).toHaveBeenCalledWith(['case-1'], 48);
    });

    /*
     * FAILURE SCENARIO: the preview search fails after a write is saved.
     * Symptom: the write response lists the case field's observables only, and its total counts
     *   the field alone, until the next read.
     * Log signature: `Failed to get the observables previews of <n> cases` (error, from the service).
     * Trigger: Elasticsearch rejects or times out the search on `.kibana_alerting_cases`.
     * Recovery: none needed; the write and everything after it ran, and the next read lists both stores.
     */
    it('getObservablesPreviewsAfterWrite returns no previews when the preview fails', async () => {
      const observableService = createObservableServiceMock();
      observableService.getter.getPreviews.mockRejectedValue(new Error('search failed'));

      await expect(
        getObservablesPreviewsAfterWrite(observableService, [{ id: 'case-1', observables: field }])
      ).resolves.toEqual(new Map());
    });

    it('getObservablesPreviewAfterWrite returns undefined when the preview fails', async () => {
      const observableService = createObservableServiceMock();
      observableService.getter.getPreviews.mockRejectedValue(new Error('search failed'));

      await expect(
        getObservablesPreviewAfterWrite(observableService, { id: 'case-1', observables: field })
      ).resolves.toBeUndefined();
    });

    it('withObservablesPreviewAfterWrite adds the preview and the total to one case', async () => {
      const observableService = createObservableServiceMock();
      observableService.getter.getPreviews.mockResolvedValue(
        new Map([['case-1', { count: 3, oldest }]])
      );

      const merged = await withObservablesPreviewAfterWrite(observableService, {
        id: 'case-1',
        observables: field,
      });

      expect(ids(merged.observables)).toEqual([...ids(field), ...ids(oldest)]);
      expect(merged.total_observables).toBe(5);
    });

    it('withObservablesPreviewAfterWrite lists and counts the field alone when the preview fails', async () => {
      const observableService = createObservableServiceMock();
      observableService.getter.getPreviews.mockRejectedValue(new Error('search failed'));

      const merged = await withObservablesPreviewAfterWrite(observableService, {
        id: 'case-1',
        observables: field,
      });

      expect(ids(merged.observables)).toEqual(ids(field));
      expect(merged.total_observables).toBe(2);
    });
  });
});
