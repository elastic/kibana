/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { faker } from '@faker-js/faker';
import { loadEmbeddableData } from './data_loader';
import {
  createUnifiedSearchApi,
  getLensApiMock,
  getLensAttributesMock,
  getLensInternalApiMock,
  makeEmbeddableServices,
} from './mocks';
import { BehaviorSubject, filter, firstValueFrom } from 'rxjs';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { LensDocument } from '../persistence';
import {
  GetStateType,
  LensApi,
  LensEmbeddableStartServices,
  LensInternalApi,
  LensOverrides,
  LensPublicCallbacks,
  LensRuntimeState,
} from './types';
import {
  HasParentApi,
  PublishesTimeRange,
  PublishesUnifiedSearch,
  PublishingSubject,
  ViewMode,
} from '@kbn/presentation-publishing';
import { PublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import { isObject } from 'lodash';
import { defaultDoc } from '../mocks';

jest.mock('@kbn/interpreter', () => ({
  toExpression: jest.fn().mockReturnValue('expression'),
}));

// Mock it for now, later investigate why the real one is not triggering here on tests
jest.mock('@kbn/presentation-publishing', () => {
  const original = jest.requireActual('@kbn/presentation-publishing');
  const rx = jest.requireActual('rxjs');
  return {
    ...original,
    fetch$: jest.fn((api: unknown) => {
      const typeApi = api as PublishesTimeRange &
        PublishesUnifiedSearch &
        HasParentApi<PublishesUnifiedSearch & PublishesSearchSession>;
      const emptyObservable = rx.of(undefined);
      return rx.merge(
        typeApi.timeRange$ ?? emptyObservable,
        typeApi.filters$ ?? emptyObservable,
        typeApi.query$ ?? emptyObservable,
        typeApi.parentApi?.filters$ ?? emptyObservable,
        typeApi.parentApi?.query$ ?? emptyObservable,
        typeApi.parentApi?.searchSessionId$ ?? emptyObservable,
        typeApi.timeRange$ ?? typeApi.parentApi?.timeRange$ ?? emptyObservable,
        typeApi.parentApi?.timeslice$ ?? emptyObservable
      );
    }),
  };
});

// In order to listen the reload function, we need to
// monitor the internalApi dispatchRenderStart spy
type ChangeFnType = ({
  api,
  getState,
  parentApi,
  internalApi,
  services,
}: {
  api: LensApi;
  internalApi: LensInternalApi;
  getState: jest.MockedFunction<GetStateType>;
  parentApi: ReturnType<typeof createUnifiedSearchApi> &
    LensPublicCallbacks & {
      searchSessionId$: BehaviorSubject<string>;
    };
  services: LensEmbeddableStartServices;
}) => Promise<void | boolean>;

async function expectRerenderOnDataLoder(
  changeFn: ChangeFnType,
  runtimeState: LensRuntimeState = { attributes: getLensAttributesMock() },
  parentApiOverrides?: Partial<
    {
      filters$: BehaviorSubject<Filter[] | undefined>;
      query$: BehaviorSubject<Query | AggregateQuery | undefined>;
      timeRange$: BehaviorSubject<TimeRange | undefined>;
    } & LensOverrides
  >
): Promise<void> {
  const parentApi = {
    ...createUnifiedSearchApi(),
    searchSessionId$: new BehaviorSubject<string>(''),
    onLoad: jest.fn(),
    onBeforeBadgesRender: jest.fn(),
    onBrushEnd: jest.fn(),
    onFilter: jest.fn(),
    onTableRowClick: jest.fn(),
    // Make TS happy
    removePanel: jest.fn(),
    replacePanel: jest.fn(),
    getPanelCount: jest.fn(),
    children$: new BehaviorSubject({}),
    addNewPanel: jest.fn(),
    ...parentApiOverrides,
  };
  const api: LensApi = {
    ...getLensApiMock(),
    parentApi,
  };
  const getState = jest.fn(() => runtimeState);
  const internalApi = getLensInternalApiMock();
  const services = makeEmbeddableServices(new BehaviorSubject<string>(''), undefined, {
    visOverrides: { id: 'lnsXY' },
    dataOverrides: { id: 'form_based' },
  });
  services.documentToExpression = jest.fn().mockResolvedValue({ ast: 'expression_string' });
  const { cleanup } = loadEmbeddableData(
    faker.string.uuid(),
    getState,
    api,
    parentApi,
    internalApi,
    services
  );
  // there's a debounce, so skip to the next tick
  jest.advanceTimersByTime(100);
  expect(internalApi.dispatchRenderStart).toHaveBeenCalledTimes(1);
  // change something
  const result = await changeFn({
    api,
    getState,
    parentApi,
    internalApi,
    services,
  });
  // fallback to true if undefined is returned
  const expectRerender = result ?? true;
  // there's a debounce, so skip to the next tick
  jest.advanceTimersByTime(200);
  // unsubscribe to all observables before checking
  cleanup();
  // now check if the re-render has been dispatched
  expect(internalApi.dispatchRenderStart).toHaveBeenCalledTimes(expectRerender ? 2 : 1);
}

function waitForValue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  observable: PublishingSubject<any>,
  predicate?: (v: NonNullable<unknown>) => boolean
) {
  // Wait for the subject to emit the first non-null value
  return firstValueFrom(observable.pipe(filter((v) => v != null && (predicate?.(v) ?? true))));
}

describe('Data Loader', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => jest.clearAllMocks());

  it('should re-render once on filter change', async () => {
    await expectRerenderOnDataLoder(async ({ api }) => {
      (api.filters$ as BehaviorSubject<Filter[]>).next([
        { meta: { alias: 'test', negate: false, disabled: false } },
      ]);
    });
  });

  it('should re-render once on search session change', async () => {
    await expectRerenderOnDataLoder(async ({ api }) => {
      // dispatch a new searchSessionId

      (
        api.parentApi as unknown as { searchSessionId$: BehaviorSubject<string | undefined> }
      ).searchSessionId$.next('newSessionId');
    });
  });

  it('should re-render once on attributes change', async () => {
    await expectRerenderOnDataLoder(async ({ internalApi }) => {
      // trigger a change by changing the title in the attributes
      (internalApi.attributes$ as BehaviorSubject<LensDocument | undefined>).next({
        ...internalApi.attributes$.getValue(),
        title: faker.lorem.word(),
      });
    });
  });

  it('should re-render when dashboard view/edit mode changes if dynamic actions are set', async () => {
    await expectRerenderOnDataLoder(async ({ api, getState }) => {
      getState.mockReturnValue({
        attributes: getLensAttributesMock(),
        enhancements: {
          dynamicActions: {
            events: [],
          },
        },
      });
      // trigger a change by changing the title in the attributes
      (api.viewMode as BehaviorSubject<ViewMode | undefined>).next('view');
    });
  });

  it('should not re-render when dashboard view/edit mode changes if dynamic actions are not set', async () => {
    await expectRerenderOnDataLoder(async ({ api }) => {
      // the default get state does not have dynamic actions
      // trigger a change by changing the title in the attributes
      (api.viewMode as BehaviorSubject<ViewMode | undefined>).next('view');
      // should not re-render
      return false;
    });
  });

  it('should pass context to embeddable', async () => {
    const query: Query = { language: 'kquery', query: '' };
    const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: false } }];

    await expectRerenderOnDataLoder(
      async ({ internalApi }) => {
        await waitForValue(
          internalApi.expressionParams$,
          (v: unknown) => isObject(v) && 'searchContext' in v
        );

        const params = internalApi.expressionParams$.getValue()!;
        expect(params.searchContext).toEqual(
          expect.objectContaining({ query: [query, defaultDoc.state.query], filters })
        );

        return false;
      },
      undefined, // use default attributes
      createUnifiedSearchApi(query, filters) // customize parentApi
    );
  });

  it('should pass render mode to expression', async () => {
    await expectRerenderOnDataLoder(async ({ internalApi }) => {
      await waitForValue(
        internalApi.expressionParams$,
        (v: unknown) => isObject(v) && 'renderMode' in v
      );
      const params = internalApi.expressionParams$.getValue();
      expect(params?.renderMode).toEqual('view');

      return false;
    });
  });

  it('should merge external context with query and filters of the saved object', async () => {
    const parentApiTimeRange: TimeRange = { from: 'now-15d', to: 'now' };
    const parentApiQuery: Query = { language: 'kquery', query: 'external query' };
    const parentApiFilters: Filter[] = [
      { meta: { alias: 'external filter', negate: false, disabled: false } },
    ];

    const vizQuery: Query = { language: 'kquery', query: 'saved filter' };
    const vizFilters: Filter[] = [
      { meta: { alias: 'test', negate: false, disabled: false, index: 'filter-0' } },
    ];

    let attributes = getLensAttributesMock();
    attributes = {
      ...attributes,
      state: {
        ...attributes.state,
        query: vizQuery,
        filters: vizFilters,
      },
      references: [
        { type: 'index-pattern', name: vizFilters[0].meta.index!, id: 'my-index-pattern-id' },
      ],
    };

    await expectRerenderOnDataLoder(
      async ({ internalApi }) => {
        await waitForValue(
          internalApi.expressionParams$,
          (v: unknown) => isObject(v) && 'searchContext' in v
        );

        const params = internalApi.expressionParams$.getValue()!;
        expect(params.searchContext).toEqual(
          expect.objectContaining({
            query: [parentApiQuery, vizQuery],
            filters: [
              ...parentApiFilters,
              ...vizFilters.map(({ meta }) => ({ meta: { ...meta, index: 'injected!' } })),
            ],
          })
        );

        return false;
      },
      { attributes },
      createUnifiedSearchApi(parentApiQuery, parentApiFilters, parentApiTimeRange)
    );
  });

  it('should call onload after rerender and onData$ call', async () => {
    await expectRerenderOnDataLoder(async ({ parentApi, internalApi, api }) => {
      expect(parentApi.onLoad).toHaveBeenLastCalledWith(true);

      await waitForValue(
        internalApi.expressionParams$,
        (v: unknown) => isObject(v) && 'expression' in v && typeof v.expression != null
      );

      const params = internalApi.expressionParams$.getValue();
      // trigger a onData
      params?.onData$?.(1);
      expect(parentApi.onLoad).toHaveBeenCalledTimes(2);
      expect(parentApi.onLoad).toHaveBeenNthCalledWith(2, false, undefined, api.dataLoading);

      // turn off the re-render check, that will be performed here
      return false;
    });
  });

  it('should initialize dateViews api with deduped list of index patterns', async () => {
    await expectRerenderOnDataLoder(
      async ({ internalApi }) => {
        await waitForValue(
          internalApi.dataViews,
          (v: NonNullable<unknown>) => Array.isArray(v) && v.length > 0
        );
        const outputIndexPatterns = internalApi.dataViews.getValue() || [];

        expect(outputIndexPatterns.length).toEqual(2);
        expect(outputIndexPatterns[0].id).toEqual('123');
        expect(outputIndexPatterns[1].id).toEqual('456');

        return false;
      },
      {
        attributes: getLensAttributesMock({
          references: [
            { type: 'index-pattern', id: '123', name: 'abc' },
            { type: 'index-pattern', id: '123', name: 'def' },
            { type: 'index-pattern', id: '456', name: 'ghi' },
          ],
        }),
      }
    );
  });

  it('should override noPadding in the display options if noPadding is set in the embeddable input', async () => {
    await expectRerenderOnDataLoder(async ({ internalApi }) => {
      await waitForValue(
        internalApi.expressionParams$,
        (v: unknown) => isObject(v) && 'expression' in v && typeof v.expression != null
      );

      const params = internalApi.expressionParams$.getValue()!;
      expect(params.noPadding).toBeUndefined();
      return false;
    });
  });

  it('should reload only once when the attributes or savedObjectId and the search context change at the same time', async () => {
    await expectRerenderOnDataLoder(async ({ internalApi, api }) => {
      // trigger a change by changing the title in the attributes
      (internalApi.attributes$ as BehaviorSubject<LensDocument | undefined>).next({
        ...internalApi.attributes$.getValue(),
        title: faker.lorem.word(),
      });
      (api.savedObjectId as BehaviorSubject<string | undefined>).next('newSavedObjectId');
    });
  });

  it('should pass over the overrides as variables', async () => {
    await expectRerenderOnDataLoder(
      async ({ internalApi }) => {
        await waitForValue(
          internalApi.expressionParams$,
          (v: unknown) => isObject(v) && 'variables' in v && typeof v.variables != null
        );

        const params = internalApi.expressionParams$.getValue()!;
        expect(params.variables).toEqual(
          expect.objectContaining({
            overrides: {
              settings: {
                onBrushEnd: 'ignore',
              },
            },
          })
        );
        return false;
      },
      // send a runtime state with the overrides
      {
        attributes: getLensAttributesMock(),
        overrides: {
          settings: {
            onBrushEnd: 'ignore',
          },
        },
      }
    );
  });
});
