/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBrowserHistory } from 'history';
import { BehaviorSubject } from 'rxjs';
import { getLensApiMock } from '@kbn/lens-plugin/public/react_embeddable/mocks';
import type { PublicAppInfo } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { LensApi, LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { Services } from './types';

const coreStart = coreMock.createStart();

export const mockLensAttributes = {
  title: 'mockTitle',
  description: 'mockDescription',
  references: [],
  state: {
    visualization: {
      id: 'mockId',
      type: 'mockType',
      title: 'mockTitle',
      visualizationType: 'mockVisualizationType',
      references: [],
      state: {
        datasourceStates: {
          indexpattern: {},
        },
      },
    },
    query: { query: '', language: 'kuery' },
    filters: [],
  },
} as unknown as LensSavedObjectAttributes;

export const getMockLensApi = (
  { from, to = 'now' }: { from: string; to: string } = { from: 'now-24h', to: 'now' },
  overrides: Partial<LensApi> = {}
): LensApi =>
  getLensApiMock({
    getFullAttributes: () => {
      return mockLensAttributes;
    },
    title$: new BehaviorSubject<string | undefined>('myPanel'),
    timeRange$: new BehaviorSubject<TimeRange | undefined>({
      from,
      to,
    }),
    ...overrides,
  });

/** A parentApi implementing `PublishesUnifiedSearch`, used to exercise the
 * merging of dashboard/page-level filters and query into the case attachment. */
export const getMockParentApiWithSearchContext = ({
  filters = [],
  query,
}: { filters?: Filter[]; query?: Query | AggregateQuery } = {}) => ({
  filters$: new BehaviorSubject<Filter[] | undefined>(filters),
  query$: new BehaviorSubject<Query | AggregateQuery | undefined>(query),
  timeRange$: new BehaviorSubject<TimeRange | undefined>({ from: 'now-15m', to: 'now' }),
});

export const getMockCurrentAppId$ = () => new BehaviorSubject<string>('securitySolutionUI');
export const getMockApplications$ = () =>
  new BehaviorSubject<Map<string, PublicAppInfo>>(
    new Map([['securitySolutionUI', { category: { label: 'Test' } } as unknown as PublicAppInfo]])
  );

export const getMockServices = () => {
  return {
    core: {
      ...coreStart,
      application: { currentAppId$: getMockCurrentAppId$(), capabilities: {} },
      uiSettings: {
        get: jest.fn().mockReturnValue(true),
      },
    },
    plugins: {
      data: {
        query: {
          filterManager: {
            // Pass-through default so tests that don't care about extraction
            // still get a valid { state, references } shape back.
            extract: jest.fn((filters: Filter[]) => ({ state: filters, references: [] })),
          },
        },
      },
    },
    storage: {},
    history: createBrowserHistory(),
  } as unknown as Services;
};
