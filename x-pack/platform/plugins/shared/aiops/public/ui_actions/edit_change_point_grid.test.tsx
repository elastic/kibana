/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CHANGE_POINT_DETECTION_VIEW_TYPE } from '@kbn/aiops-change-point-detection/constants';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import {
  CHANGE_POINT_GRID_EMBEDDABLE_TYPE,
  type ChangePointGridConfiguration,
} from '@kbn/discover-utils';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { initializeTitleManager, type ViewMode } from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-util';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { canUseAiops } from '../capabilities';
import { buildChangePointEsql } from '../embeddables/change_point_chart/build_change_point_esql';
import { EmbeddableChangePointEsqlUserInput } from '../embeddables/change_point_chart/change_point_esql_config_input';
import type { AiopsCoreSetup } from '../types';
import {
  createEditChangePointGridAction,
  isEditableChangePointGridApi,
} from './edit_change_point_grid';

jest.mock('@kbn/presentation-util', () => ({
  openLazyFlyout: jest.fn(),
}));

jest.mock('../capabilities', () => ({
  canUseAiops: jest.fn(),
}));

jest.mock('../embeddables/change_point_chart/change_point_esql_config_input', () => ({
  EmbeddableChangePointEsqlUserInput: jest.fn(() => null),
}));

const mockOpenLazyFlyout = jest.mocked(openLazyFlyout);
const mockCanUseAiops = jest.mocked(canUseAiops);

const savedFormConfig = {
  mode: 'form' as const,
  data_view_id: 'logs-dv',
  aggregation_function: 'avg' as const,
  metric_field: 'bytes',
  split_field: 'host.name',
  partitions: ['web-1'],
};

const matchingFormEsql =
  buildChangePointEsql({
    indexPattern: 'logs-*',
    timeField: '@timestamp',
    aggregationFunction: 'avg',
    metricField: 'bytes',
    splitField: 'host.name',
    partitions: ['web-1'],
  }) ?? '';

const createMockDataView = (overrides?: Partial<{ fields: DataViewField[] }>) => ({
  id: 'logs-dv',
  title: 'Logs Data View',
  timeFieldName: '@timestamp',
  isTimeBased: () => true,
  getIndexPattern: () => 'logs-*',
  fields:
    overrides?.fields ??
    ([
      {
        name: 'bytes',
        displayName: 'bytes',
        type: 'number',
        aggregatable: true,
        searchable: true,
        scripted: false,
      },
      {
        name: 'host.name',
        displayName: 'host.name',
        type: 'string',
        esTypes: [ES_FIELD_TYPES.KEYWORD],
        aggregatable: true,
        searchable: true,
        scripted: false,
      },
    ] as DataViewField[]),
});

const createMockGridApi = (
  options: {
    configuration?: ChangePointGridConfiguration;
    esql?: string;
    viewMode?: ViewMode;
    timeRange?: TimeRange;
    title?: string;
  } = {}
) => {
  const configuration = 'configuration' in options ? options.configuration : savedFormConfig;
  const esql: string = options.esql ?? matchingFormEsql;
  const viewMode = options.viewMode ?? 'edit';
  const timeRange = options.timeRange;
  const viewMode$ = new BehaviorSubject<ViewMode>(viewMode);
  const configuration$ = new BehaviorSubject<ChangePointGridConfiguration | undefined>(
    configuration
  );
  const esql$ = new BehaviorSubject<AggregateQuery[]>([{ esql }]);
  const approximationApplied$ = new BehaviorSubject<boolean | undefined>(undefined);
  const timeRange$ = new BehaviorSubject<TimeRange | undefined>(timeRange);
  const titleManager = initializeTitleManager({ title: options.title ?? 'Existing title' });
  const setTitle = jest.spyOn(titleManager.api, 'setTitle');
  const setTimeRange = jest.fn((nextRange?: TimeRange) => timeRange$.next(nextRange));
  const updateChangePointQuery = jest.fn(
    (next: { esql: string; configuration: ChangePointGridConfiguration | undefined }) => {
      esql$.next([{ esql: next.esql }]);
      configuration$.next(next.configuration);
    }
  );
  const parentApi = { viewMode$ };

  return {
    ...titleManager.api,
    uuid: 'panel-1',
    type: CHANGE_POINT_GRID_EMBEDDABLE_TYPE,
    parentApi,
    viewMode$,
    configuration$,
    esql$,
    approximationApplied$,
    timeRange$,
    setTitle,
    setTimeRange,
    updateChangePointQuery,
  };
};

const createGetStartServices = ({
  enableEsql = true,
  canShowDiscover = true,
  dataViewImpl = async () => createMockDataView(),
}: {
  enableEsql?: boolean;
  canShowDiscover?: boolean;
  dataViewImpl?: (id: string) => Promise<ReturnType<typeof createMockDataView>>;
} = {}): AiopsCoreSetup['getStartServices'] =>
  jest.fn().mockResolvedValue([
    {
      uiSettings: {
        get: jest.fn((key: string) => (key === ENABLE_ESQL ? enableEsql : undefined)),
      },
      application: {
        capabilities: {
          discover_v2: { show: canShowDiscover },
        },
      },
    },
    {
      data: {
        dataViews: {
          get: jest.fn(dataViewImpl),
        },
      },
    },
  ]);

describe('edit_change_point_grid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanUseAiops.mockReturnValue(true);
  });

  it('validates the structural contract in isEditableChangePointGridApi', () => {
    const validApi = createMockGridApi();
    expect(isEditableChangePointGridApi(validApi)).toBe(true);

    expect(isEditableChangePointGridApi({ ...validApi, type: 'discover_session' })).toBe(false);
    expect(isEditableChangePointGridApi({ ...validApi, configuration$: undefined })).toBe(false);
    expect(isEditableChangePointGridApi({ ...validApi, updateChangePointQuery: undefined })).toBe(
      false
    );
    expect(
      isEditableChangePointGridApi({
        ...validApi,
        viewMode$: undefined,
        parentApi: {},
      })
    ).toBe(false);
  });

  it('is compatible only with configured grid panels in edit mode when enableESQL and canUseAiops are true', async () => {
    const configuredApi = createMockGridApi();
    const discoverCreatedApi = createMockGridApi({ configuration: undefined });
    const viewModeApi = createMockGridApi({ viewMode: 'view' });

    const action = createEditChangePointGridAction(createGetStartServices({ enableEsql: true }));

    expect(await action.isCompatible!({ embeddable: configuredApi as never })).toBe(true);
    expect(await action.isCompatible!({ embeddable: discoverCreatedApi as never })).toBe(false);
    expect(await action.isCompatible!({ embeddable: viewModeApi as never })).toBe(false);

    const actionEsqlOff = createEditChangePointGridAction(
      createGetStartServices({ enableEsql: false })
    );
    expect(await actionEsqlOff.isCompatible!({ embeddable: configuredApi as never })).toBe(false);

    mockCanUseAiops.mockReturnValue(false);
    expect(await action.isCompatible!({ embeddable: configuredApi as never })).toBe(false);

    // Emits compatibility change notifications when viewMode$ or configuration$ changes
    const emissions = jest.fn();
    const sub = action.getCompatibilityChangesSubject!({
      embeddable: configuredApi as never,
    })!.subscribe(emissions);
    emissions.mockClear();

    configuredApi.viewMode$.next('view');
    configuredApi.configuration$.next({ mode: 'esql' });
    expect(emissions).toHaveBeenCalledTimes(2);
    sub.unsubscribe();
  });

  it('reopens in form mode when saved fields regenerate the saved query, locks view type, previews panel time range, and updates in place on Confirm or leaves unchanged on Cancel', async () => {
    const panelTimeRange: TimeRange = { from: 'now-7d', to: 'now' };
    const embeddable = createMockGridApi({
      timeRange: panelTimeRange,
      title: 'Change point: avg(bytes) split by "host.name"',
    });
    const action = createEditChangePointGridAction(createGetStartServices());

    await action.execute({ embeddable: embeddable as never });
    expect(mockOpenLazyFlyout).toHaveBeenCalledTimes(1);

    const closeFlyout = jest.fn();
    const element = (await mockOpenLazyFlyout.mock.calls[0][0].loadContent({
      ariaLabelledBy: 'changePointConfig',
      closeFlyout,
    })) as React.ReactElement<React.ComponentProps<typeof EmbeddableChangePointEsqlUserInput>>;

    expect(element.type).toBe(EmbeddableChangePointEsqlUserInput);
    expect(element.props.isEditing).toBe(true);
    expect(element.props.initialMode).toBe('form');
    expect(element.props.initialFormConfiguration).toEqual(savedFormConfig);
    expect(element.props.initialEsql).toBe(matchingFormEsql);
    expect(element.props.previewTimeRange).toEqual(panelTimeRange);
    expect(element.props.dashboardParentApi).toBe(embeddable.parentApi);

    // Cancel changes nothing
    element.props.onCancel();
    expect(embeddable.updateChangePointQuery).not.toHaveBeenCalled();
    expect(embeddable.setTitle).not.toHaveBeenCalled();
    expect(embeddable.setTimeRange).not.toHaveBeenCalled();
    expect(closeFlyout).toHaveBeenCalledTimes(1);

    // Confirm in form mode updates query + configuration + title, preserving time range
    const updatedFormEsql = 'FROM logs-* | CHANGE_POINT `max_bytes` ON bucket';
    element.props.onConfirm({
      mode: 'form',
      viewType: CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS,
      esql: updatedFormEsql,
      dataViewId: 'logs-dv',
      aggregationFunction: 'max',
      metricField: 'bytes',
    });

    expect(embeddable.updateChangePointQuery).toHaveBeenCalledWith({
      esql: updatedFormEsql,
      configuration: {
        mode: 'form',
        data_view_id: 'logs-dv',
        aggregation_function: 'max',
        metric_field: 'bytes',
      },
    });
    expect(embeddable.setTitle).toHaveBeenCalledWith('Change point: max(bytes)');
    expect(embeddable.setTimeRange).not.toHaveBeenCalled();
    expect(embeddable.timeRange$.getValue()).toEqual(panelTimeRange);
  });

  it('preserves a custom title when confirming form edits', async () => {
    const embeddable = createMockGridApi({ title: 'My custom title' });
    const action = createEditChangePointGridAction(createGetStartServices());

    await action.execute({ embeddable: embeddable as never });
    const element = (await mockOpenLazyFlyout.mock.calls.at(-1)![0].loadContent({
      ariaLabelledBy: 'changePointConfig',
      closeFlyout: jest.fn(),
    })) as React.ReactElement<React.ComponentProps<typeof EmbeddableChangePointEsqlUserInput>>;

    element.props.onConfirm({
      mode: 'form',
      viewType: CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS,
      esql: 'FROM logs-* | CHANGE_POINT `max_bytes` ON bucket',
      dataViewId: 'logs-dv',
      aggregationFunction: 'max',
      metricField: 'bytes',
    });

    expect(embeddable.updateChangePointQuery).toHaveBeenCalled();
    expect(embeddable.setTitle).not.toHaveBeenCalled();
    expect(embeddable.title$.getValue()).toBe('My custom title');
  });

  it('reopens in direct-edit mode when mode is esql, query diverged, or data view / fields cannot regenerate the query, and preserves current title on Confirm', async () => {
    const customEsql = 'FROM custom-* | CHANGE_POINT m ON b';

    // 1. Saved mode === 'esql'
    const directApi = createMockGridApi({
      configuration: { mode: 'esql' },
      esql: customEsql,
    });
    const action = createEditChangePointGridAction(createGetStartServices());
    await action.execute({ embeddable: directApi as never });

    const closeFlyout = jest.fn();
    const directElement = (await mockOpenLazyFlyout.mock.calls.at(-1)![0].loadContent({
      ariaLabelledBy: 'changePointConfig',
      closeFlyout,
    })) as React.ReactElement<React.ComponentProps<typeof EmbeddableChangePointEsqlUserInput>>;

    expect(directElement.props.initialMode).toBe('esql');
    expect(directElement.props.initialFormConfiguration).toBeUndefined();
    expect(directElement.props.initialEsql).toBe(customEsql);

    // Confirm in direct-edit mode updates query & configuration without calling setTitle
    const nextDirectEsql = 'FROM custom-v2-* | CHANGE_POINT m ON b';
    directElement.props.onConfirm({
      mode: 'esql',
      viewType: CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS,
      esql: nextDirectEsql,
    });
    expect(directApi.updateChangePointQuery).toHaveBeenCalledWith({
      esql: nextDirectEsql,
      configuration: { mode: 'esql' },
    });
    expect(directApi.setTitle).not.toHaveBeenCalled();

    // 2. Saved mode === 'form', but saved query diverged from form fields
    const divergedApi = createMockGridApi({
      configuration: savedFormConfig,
      esql: customEsql,
    });
    await action.execute({ embeddable: divergedApi as never });
    const divergedElement = (await mockOpenLazyFlyout.mock.calls.at(-1)![0].loadContent({
      ariaLabelledBy: 'changePointConfig',
      closeFlyout,
    })) as React.ReactElement<React.ComponentProps<typeof EmbeddableChangePointEsqlUserInput>>;
    expect(divergedElement.props.initialMode).toBe('esql');
    expect(divergedElement.props.initialEsql).toBe(customEsql);

    // 3. Saved mode === 'form', but dataView lookup fails
    const missingDataViewAction = createEditChangePointGridAction(
      createGetStartServices({
        dataViewImpl: async () => {
          throw new Error('Saved object not found');
        },
      })
    );
    const missingDvApi = createMockGridApi();
    await missingDataViewAction.execute({ embeddable: missingDvApi as never });
    const missingDvElement = (await mockOpenLazyFlyout.mock.calls.at(-1)![0].loadContent({
      ariaLabelledBy: 'changePointConfig',
      closeFlyout,
    })) as React.ReactElement<React.ComponentProps<typeof EmbeddableChangePointEsqlUserInput>>;
    expect(missingDvElement.props.initialMode).toBe('esql');
    expect(missingDvElement.props.initialEsql).toBe(matchingFormEsql);
  });
});
