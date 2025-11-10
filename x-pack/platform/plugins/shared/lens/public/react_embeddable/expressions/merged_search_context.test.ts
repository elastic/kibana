/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LensRuntimeState } from '../..';
import { getMergedSearchContext } from './merged_search_context';
import type { TimeRange } from '@kbn/es-query';

describe('getMergedSearchContext - projectRouting', () => {
  const mockData = {
    nowProvider: {
      get: jest.fn(() => new Date('2025-01-01T00:00:00Z')),
    },
  } as unknown as DataPublicPluginStart;

  const mockInjectFilterReferences = jest.fn((filters, refs) => filters);

  const createLensRuntimeState = (projectRouting?: '_alias:_origin'): LensRuntimeState =>
    ({
      attributes: {
        state: {
          query: { query: '', language: 'kuery' },
          filters: [],
        },
        references: [],
      },
    } as unknown as LensRuntimeState);

  const customTimeRange$ = new BehaviorSubject<TimeRange | undefined>(undefined);
  const parentApi = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('projectRouting merging logic', () => {
    it('should use parent projectRouting when shouldOverride is false', () => {
      const lensState = createLensRuntimeState('_alias:_origin'); // Panel has _alias:_origin
      const parentProjectRouting = undefined; // Parent (dashboard) has undefined

      const result = getMergedSearchContext(
        lensState,
        { projectRouting: parentProjectRouting },
        customTimeRange$,
        parentApi,
        { data: mockData, injectFilterReferences: mockInjectFilterReferences }
      );

      // Currently, it should use parent's projectRouting (undefined), not panel's (_alias:_origin)
      expect(result.projectRouting).toBeUndefined();
    });

    it('should use parent projectRouting even when panel has different value', () => {
      const lensState = createLensRuntimeState(undefined); // Panel has undefined
      const parentProjectRouting = '_alias:_origin'; // Parent (dashboard) has _alias:_origin

      const result = getMergedSearchContext(
        lensState,
        { projectRouting: parentProjectRouting },
        customTimeRange$,
        parentApi,
        { data: mockData, injectFilterReferences: mockInjectFilterReferences }
      );

      // Should use parent's _alias:_origin
      expect(result.projectRouting).toBe('_alias:_origin');
    });
  });
});
