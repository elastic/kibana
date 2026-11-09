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
  getObservablesPreviews,
  mergeObservablesPreview,
  withObservablesPreview,
} from './observables_preview';

const observable = (id: string): Observable => ({
  id,
  typeKey: 'observable-type-ipv4',
  value: `10.0.0.${id}`,
  description: null,
  createdAt: '2026-11-06T09:30:00.000Z',
  updatedAt: null,
});

const observables = (count: number, prefix: string): Observable[] =>
  Array.from({ length: count }, (_, index) => observable(`${prefix}${index}`));

describe('observables preview', () => {
  describe('mergeObservablesPreview', () => {
    it('lists the field first, then the oldest objects, up to the preview size', () => {
      const merged = mergeObservablesPreview(
        { id: 'case-1', observables: observables(10, 'field-') },
        { count: 200, oldest: observables(50, 'type-') }
      );

      expect(merged.observables).toHaveLength(MAX_OBSERVABLES_PER_CASE);
      expect(merged.observables.slice(0, 10).map(({ id }) => id)).toEqual(
        observables(10, 'field-').map(({ id }) => id)
      );
      expect(merged.observables.slice(10).map(({ id }) => id)).toEqual(
        observables(40, 'type-').map(({ id }) => id)
      );
      expect(merged.total_observables).toBe(210);
    });

    it('keeps every field observable, even past the preview size', () => {
      const merged = mergeObservablesPreview(
        { id: 'case-1', observables: observables(60, 'field-') },
        { count: 5, oldest: observables(5, 'type-') }
      );

      expect(merged.observables).toHaveLength(60);
      expect(merged.total_observables).toBe(65);
    });

    it('counts only the field when the case has no objects of the type', () => {
      const merged = mergeObservablesPreview(
        { id: 'case-1', observables: observables(3, 'field-'), total_observables: 0 },
        undefined
      );

      expect(merged.observables).toHaveLength(3);
      expect(merged.total_observables).toBe(3);
    });

    it('treats a missing field as empty', () => {
      const merged = mergeObservablesPreview(
        { id: 'case-1' },
        { count: 2, oldest: observables(2, 'type-') }
      );

      expect(merged.observables.map(({ id }) => id)).toEqual(['type-0', 'type-1']);
      expect(merged.total_observables).toBe(2);
    });
  });

  describe('getObservablesPreviews', () => {
    it('sizes the preview for the case whose field holds the fewest observables', async () => {
      const observableService = createObservableServiceMock();

      await getObservablesPreviews(
        [
          { id: 'case-1', observables: observables(45, 'a') },
          { id: 'case-2', observables: observables(10, 'b') },
        ],
        observableService
      );

      expect(observableService.getPreviews).toHaveBeenCalledWith(['case-1', 'case-2'], 40);
    });

    it('asks for counts only when every field is full', async () => {
      const observableService = createObservableServiceMock();

      await getObservablesPreviews(
        [{ id: 'case-1', observables: observables(MAX_OBSERVABLES_PER_CASE, 'a') }],
        observableService
      );

      expect(observableService.getPreviews).toHaveBeenCalledWith(['case-1'], 0);
    });

    it('does not query without cases', async () => {
      const observableService = createObservableServiceMock();

      await expect(getObservablesPreviews([], observableService)).resolves.toEqual(new Map());
      expect(observableService.getPreviews).not.toHaveBeenCalled();
    });
  });

  describe('withObservablesPreview', () => {
    it('merges each case with its own preview', async () => {
      const observableService = createObservableServiceMock();
      observableService.getPreviews.mockResolvedValue(
        new Map([['case-2', { count: 1, oldest: [observable('t')] }]])
      );

      const [first, second] = await withObservablesPreview(
        [
          { id: 'case-1', observables: [observable('f')] },
          { id: 'case-2', observables: [] },
        ],
        observableService
      );

      expect(first.observables.map(({ id }) => id)).toEqual(['f']);
      expect(first.total_observables).toBe(1);
      expect(second.observables.map(({ id }) => id)).toEqual(['t']);
      expect(second.total_observables).toBe(1);
    });
  });
});
