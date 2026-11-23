/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { CHANGE_POINT_DETECTION_VIEW_TYPE } from '@kbn/aiops-change-point-detection/constants';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { I18nProvider } from '@kbn/i18n-react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';
import { ViewTypeSelector } from '../../components/change_point_detection/view_type_selector';
import { buildChangePointEsql } from './build_change_point_esql';
import {
  ChangePointEsqlInitializer,
  isEsqlCompatibleField,
  type ChangePointEsqlInitializerProps,
} from './change_point_esql_initializer';
import type { ChangePointPreviewStateUpdate } from './change_point_preview';

let latestEditorProps: {
  query: { esql: string };
  isDisabled?: boolean;
  hideRunQueryButton?: boolean;
  onTextLangQueryChange: (q: { esql: string }) => void;
  onTextLangQuerySubmit: (q?: { esql: string }) => Promise<void>;
};

jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: (props: typeof latestEditorProps) => {
    latestEditorProps = props;
    return (
      <div>
        <textarea
          data-test-subj="aiopsChangePointEsqlEditor"
          disabled={props.isDisabled}
          value={props.query.esql}
          onChange={(e) => props.onTextLangQueryChange({ esql: e.target.value })}
        />
        {!props.hideRunQueryButton ? (
          <button
            type="button"
            data-test-subj="mockRunEsqlQueryButton"
            onClick={() => {
              void props.onTextLangQuerySubmit({ esql: props.query.esql });
            }}
          >
            Run
          </button>
        ) : null}
      </div>
    );
  },
}));

let latestPreviewProps: {
  previewKey: string | undefined;
  structuralError?: string;
  debounceMs?: number;
  onStatusChange: (update: ChangePointPreviewStateUpdate) => void;
};

jest.mock('./change_point_preview', () => ({
  ChangePointPanelPreview: (props: typeof latestPreviewProps) => {
    latestPreviewProps = props;
    return (
      <div
        data-test-subj="mockChangePointPreview"
        data-preview-key={props.previewKey ?? ''}
        data-structural-error={props.structuralError ?? ''}
      />
    );
  },
}));

const createMockDataView = (
  overrides?: Partial<{ fields: DataViewField[]; timeFieldName?: string }>
) => {
  const fields: DataViewField[] = overrides?.fields ?? [
    {
      name: 'scripted_metric',
      displayName: 'scripted_metric',
      type: 'number',
      aggregatable: true,
      searchable: true,
      scripted: true,
    } as DataViewField,
    {
      name: 'runtime_metric',
      displayName: 'runtime_metric',
      type: 'number',
      aggregatable: true,
      searchable: true,
      scripted: false,
      runtimeField: { type: 'long', script: { source: 'emit(1)' } },
    } as unknown as DataViewField,
    {
      name: 'bytes',
      displayName: 'bytes',
      type: 'number',
      aggregatable: true,
      searchable: true,
      scripted: false,
    } as DataViewField,
    {
      name: 'runtime_host',
      displayName: 'runtime_host',
      type: 'string',
      esTypes: [ES_FIELD_TYPES.KEYWORD],
      aggregatable: true,
      searchable: true,
      scripted: false,
      isMapped: false,
    } as DataViewField,
    {
      name: 'host.name',
      displayName: 'host.name',
      type: 'string',
      esTypes: [ES_FIELD_TYPES.KEYWORD],
      aggregatable: true,
      searchable: true,
      scripted: false,
    } as DataViewField,
  ];

  const timeFieldName =
    'timeFieldName' in (overrides ?? {}) ? overrides?.timeFieldName : '@timestamp';

  return {
    id: 'logs-dv',
    title: 'Logs Data View',
    timeFieldName,
    isTimeBased: () => Boolean(timeFieldName),
    getIndexPattern: () => 'logs-*',
    fields,
  };
};

const renderInitializer = (
  props: Partial<ChangePointEsqlInitializerProps> = {},
  dataView = createMockDataView()
) => {
  const dataViewsGet = jest.fn().mockResolvedValue(dataView);
  const contextValue = {
    embeddingOrigin: 'flyout',
    data: {
      dataViews: { get: dataViewsGet },
      query: {
        filterManager: {
          getFilters: () => [],
          getUpdates$: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        },
        queryString: {
          getQuery: () => ({ query: '', language: 'kuery' }),
          getUpdates$: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        },
        timefilter: {
          timefilter: {
            getTime: () => ({ from: 'now-15m', to: 'now' }),
            getTimeUpdate$: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
            getRefreshInterval: () => ({ pause: true, value: 0 }),
            getRefreshIntervalUpdate$: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
          },
        },
      },
      search: { search: jest.fn() },
    },
    unifiedSearch: {
      ui: {
        IndexPatternSelect: ({
          indexPatternId,
          onChange,
        }: {
          indexPatternId: string;
          onChange: (id: string) => void;
        }) => (
          <input
            data-test-subj="aiopsChangePointChartEmbeddableDataViewSelector"
            value={indexPatternId}
            onChange={(e) => onChange(e.target.value)}
          />
        ),
      },
    },
    notifications: { toasts: { addError: jest.fn() } },
    uiSettings: { get: jest.fn() },
  } as unknown as NonNullable<React.ContextType<typeof AiopsAppContext>>;

  const onConfirm = props.onConfirm ?? jest.fn();
  const onCancel = props.onCancel ?? jest.fn();

  const view = render(
    <I18nProvider>
      <EuiProvider>
        <AiopsAppContext.Provider value={contextValue}>
          <ChangePointEsqlInitializer
            dashboardParentApi={{}}
            onConfirm={onConfirm}
            onCancel={onCancel}
            {...props}
          />
        </AiopsAppContext.Provider>
      </EuiProvider>
    </I18nProvider>
  );

  return { ...view, onConfirm, onCancel, dataViewsGet };
};

describe('ChangePointEsqlInitializer', () => {
  it('filters out scripted and runtime fields while keeping mapped fields', () => {
    const dv = createMockDataView();
    expect(dv.fields.filter(isEsqlCompatibleField).map((f) => f.name)).toEqual([
      'bytes',
      'host.name',
    ]);
  });

  it('starts in form mode without rendering the editor, hides max series, filters incompatible fields, and gates Confirm on preview readiness', async () => {
    const { onConfirm } = renderInitializer();

    const confirmButton = screen.getByTestId('aiopsChangePointChartsInitializerConfirmButton');

    expect(confirmButton).toBeDisabled();
    expect(screen.queryByTestId('aiopsChangePointEsqlEditor')).toBeNull();
    expect(screen.queryByTestId('aiopsMaxSeriesControlFieldNumber')).toBeNull();

    // Select data view -> picks first compatible metric ('bytes', skipping scripted & runtime)
    fireEvent.change(screen.getByTestId('aiopsChangePointChartEmbeddableDataViewSelector'), {
      target: { value: 'logs-dv' },
    });

    const expectedEsql = buildChangePointEsql({
      indexPattern: 'logs-*',
      timeField: '@timestamp',
      aggregationFunction: 'avg',
      metricField: 'bytes',
    })!;

    await waitFor(() => {
      expect(latestPreviewProps.previewKey).toContain(expectedEsql);
    });
    expect(screen.queryByTestId('aiopsMaxSeriesControlFieldNumber')).toBeNull();
    expect(screen.queryByTestId('aiopsChangePointEsqlEditor')).toBeNull();

    // Confirm stays disabled until preview reports ready for the current key
    expect(confirmButton).toBeDisabled();

    act(() => {
      latestPreviewProps.onStatusChange({
        key: latestPreviewProps.previewKey,
        status: 'ready',
      });
    });

    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith({
      mode: 'form',
      viewType: CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS,
      esql: expectedEsql,
      dataViewId: 'logs-dv',
      aggregationFunction: 'avg',
      metricField: 'bytes',
    });
  });

  it('switches cleanly between form and query modes, preserves both states, validates CHANGE_POINT queries, and runs immediate preview on submit', async () => {
    const { onConfirm } = renderInitializer({
      initialMode: 'form',
      initialFormConfiguration: {
        mode: 'form',
        data_view_id: 'logs-dv',
        aggregation_function: 'avg',
        metric_field: 'bytes',
      },
    });

    const generatedQuery = buildChangePointEsql({
      indexPattern: 'logs-*',
      timeField: '@timestamp',
      aggregationFunction: 'avg',
      metricField: 'bytes',
    })!;

    await waitFor(() => {
      expect(latestPreviewProps.previewKey).toContain(generatedQuery);
    });
    expect(screen.queryByTestId('aiopsChangePointEsqlEditor')).toBeNull();

    // Switch to query mode -> seeds empty editor with generated query and hides form controls
    fireEvent.click(screen.getByText('Write a query'));
    expect(screen.queryByTestId('aiopsChangePointChartEmbeddableDataViewSelector')).toBeNull();
    const editor = screen.getByTestId('aiopsChangePointEsqlEditor') as HTMLTextAreaElement;
    expect(editor.disabled).toBe(false);
    expect(editor.value).toBe(generatedQuery);

    // Enter an invalid query (no CHANGE_POINT) -> structural error blocks Confirm
    fireEvent.change(editor, { target: { value: 'FROM logs-* | STATS c = COUNT()' } });
    expect(latestPreviewProps.structuralError).toBeTruthy();
    expect(screen.getByTestId('aiopsChangePointChartsInitializerConfirmButton')).toBeDisabled();

    // Enter a valid custom CHANGE_POINT query
    const customQuery =
      'FROM metrics-* | STATS m = MAX(latency) BY b = BUCKET(@timestamp, 50, ?_tstart, ?_tend) | CHANGE_POINT m ON b';
    fireEvent.change(editor, { target: { value: customQuery } });
    expect(latestPreviewProps.structuralError).toBeUndefined();
    expect(latestPreviewProps.debounceMs).toBeUndefined();

    // Run button / Cmd+Enter submits query for immediate preview (debounceMs = 0)
    fireEvent.click(screen.getByTestId('mockRunEsqlQueryButton'));
    expect(latestPreviewProps.debounceMs).toBe(0);

    // Subsequent edit restores default debounce
    const updatedCustomQuery = `${customQuery} BY host.name`;
    fireEvent.change(editor, { target: { value: updatedCustomQuery } });
    expect(latestPreviewProps.debounceMs).toBeUndefined();

    // Switching back to form mode preserves form state without a modal, and switching back to query keeps custom query
    fireEvent.click(screen.getByText('Build with form'));
    expect(screen.queryByTestId('aiopsChangePointEsqlEditor')).toBeNull();
    expect(
      (screen.getByTestId('aiopsChangePointChartEmbeddableDataViewSelector') as HTMLInputElement)
        .value
    ).toBe('logs-dv');
    expect(latestPreviewProps.previewKey).toContain(generatedQuery);

    fireEvent.click(screen.getByText('Write a query'));
    const reopenedEditor = screen.getByTestId('aiopsChangePointEsqlEditor') as HTMLTextAreaElement;
    expect(reopenedEditor.value).toBe(updatedCustomQuery);

    // Preview ready -> Confirm submits esql mode
    act(() => {
      latestPreviewProps.onStatusChange({
        key: latestPreviewProps.previewKey,
        status: 'ready',
      });
    });
    const confirmButton = screen.getByTestId('aiopsChangePointChartsInitializerConfirmButton');
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith({
      mode: 'esql',
      viewType: CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS,
      esql: updatedCustomQuery,
    });
  });

  it('opens esql panels in query mode with initialEsql, and seeds query mode from current form edits on form panels', async () => {
    const savedCustomQuery =
      'FROM traces-* | STATS m = MAX(duration) BY b = BUCKET(@timestamp, 50, ?_tstart, ?_tend) | CHANGE_POINT m ON b';
    const esqlEditView = renderInitializer({
      isEditing: true,
      initialMode: 'esql',
      initialEsql: savedCustomQuery,
    });

    const customEditor = screen.getByTestId('aiopsChangePointEsqlEditor') as HTMLTextAreaElement;
    expect(customEditor.value).toBe(savedCustomQuery);
    expect(screen.queryByTestId('aiopsChangePointChartEmbeddableDataViewSelector')).toBeNull();
    esqlEditView.unmount();

    // Form-mode edit passes stale initialEsql alongside initialFormConfiguration; switching to query after
    // changing the form must seed from the updated form rather than the stale saved query.
    const staleSavedQuery = buildChangePointEsql({
      indexPattern: 'logs-*',
      timeField: '@timestamp',
      aggregationFunction: 'avg',
      metricField: 'bytes',
    })!;
    const metricsDataView = {
      ...createMockDataView({
        fields: [
          {
            name: 'latency',
            displayName: 'latency',
            type: 'number',
            aggregatable: true,
            searchable: true,
            scripted: false,
          } as DataViewField,
        ],
      }),
      id: 'metrics-dv',
      getIndexPattern: () => 'metrics-*',
    };
    const logsDataView = createMockDataView();

    const { dataViewsGet } = renderInitializer({
      isEditing: true,
      initialMode: 'form',
      initialFormConfiguration: {
        mode: 'form',
        data_view_id: 'logs-dv',
        aggregation_function: 'avg',
        metric_field: 'bytes',
      },
      initialEsql: staleSavedQuery,
    });
    dataViewsGet.mockImplementation(async (id: string) =>
      id === 'metrics-dv' ? metricsDataView : logsDataView
    );

    await waitFor(() => {
      expect(latestPreviewProps.previewKey).toContain(staleSavedQuery);
    });

    fireEvent.change(screen.getByTestId('aiopsChangePointChartEmbeddableDataViewSelector'), {
      target: { value: 'metrics-dv' },
    });
    const updatedGeneratedQuery = buildChangePointEsql({
      indexPattern: 'metrics-*',
      timeField: '@timestamp',
      aggregationFunction: 'avg',
      metricField: 'latency',
    })!;
    await waitFor(() => {
      expect(latestPreviewProps.previewKey).toContain(updatedGeneratedQuery);
    });

    fireEvent.click(screen.getByText('Write a query'));
    const seededEditor = screen.getByTestId('aiopsChangePointEsqlEditor') as HTMLTextAreaElement;
    expect(seededEditor.value).toBe(updatedGeneratedQuery);
  });

  it('hides Table without Discover permission, locks view type when editing, and leaves ViewTypeSelector default unchanged', () => {
    const { unmount } = renderInitializer({ showTableOption: false });
    expect(screen.getByText('Charts')).toBeTruthy();
    expect(screen.queryByText('Table')).toBeNull();
    unmount();

    // Editing locks ViewTypeSelector while leaving the input mode toggle enabled.
    // EuiButtonGroup renders <button data-test-subj={option.id}>, not radio inputs.
    const editRender = renderInitializer({ isEditing: true });
    const viewTypeSelector = screen.getByTestId('aiopsChangePointViewTypeSelector');
    const viewTypeButtons = viewTypeSelector.querySelectorAll('button');
    expect(viewTypeButtons.length).toBeGreaterThan(0);
    viewTypeButtons.forEach((element) => {
      expect(element).toBeDisabled();
    });
    const modeSelector = screen.getByTestId('aiopsChangePointInputModeSelector');
    const modeButtons = modeSelector.querySelectorAll('button');
    expect(modeButtons.length).toBeGreaterThan(0);
    modeButtons.forEach((element) => {
      expect(element).not.toBeDisabled();
    });
    editRender.unmount();

    // Default ViewTypeSelector used by the existing initializer still renders both options
    render(
      <I18nProvider>
        <EuiProvider>
          <ViewTypeSelector value={CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS} onChange={jest.fn()} />
        </EuiProvider>
      </I18nProvider>
    );
    expect(screen.getByText('Charts')).toBeTruthy();
    expect(screen.getByText('Table')).toBeTruthy();
  });

  it('resets form controls cleanly when switching across a non-time-based data view to another valid data view', async () => {
    const logsDataView = createMockDataView();
    const noTimeDataView = {
      ...createMockDataView({ timeFieldName: undefined }),
      id: 'static-dv',
      getIndexPattern: () => 'static-*',
    };
    const metricsDataView = {
      ...createMockDataView({
        fields: [
          {
            name: 'latency',
            displayName: 'latency',
            type: 'number',
            aggregatable: true,
            searchable: true,
            scripted: false,
          } as DataViewField,
        ],
      }),
      id: 'metrics-dv',
      getIndexPattern: () => 'metrics-*',
    };

    const { dataViewsGet } = renderInitializer();
    dataViewsGet.mockImplementation(async (id: string) => {
      if (id === 'static-dv') return noTimeDataView;
      if (id === 'metrics-dv') return metricsDataView;
      return logsDataView;
    });

    const selector = screen.getByTestId('aiopsChangePointChartEmbeddableDataViewSelector');

    fireEvent.change(selector, { target: { value: 'logs-dv' } });
    await waitFor(() => {
      expect(latestPreviewProps.previewKey).toContain('FROM logs-*');
    });

    // Switch to non-time-based data view -> clears generated query and shows warning
    fireEvent.change(selector, { target: { value: 'static-dv' } });
    await waitFor(() => {
      expect(latestPreviewProps.previewKey).toBeUndefined();
    });

    // Switch to metrics-dv -> populates default metric ('latency') on the new data view
    fireEvent.change(selector, { target: { value: 'metrics-dv' } });
    await waitFor(() => {
      expect(latestPreviewProps.previewKey).toContain('FROM metrics-*');
      expect(latestPreviewProps.previewKey).toContain('| STATS `avg_latency` = AVG(`latency`)');
    });
  });

  it('shows the detected-only switch only for Table form mode, keeps Charts unfiltered, and submits the filtered query for Table', async () => {
    const { onConfirm } = renderInitializer({
      initialMode: 'form',
      initialFormConfiguration: {
        mode: 'form',
        data_view_id: 'logs-dv',
        aggregation_function: 'avg',
        metric_field: 'bytes',
      },
    });

    const unfilteredEsql = buildChangePointEsql({
      indexPattern: 'logs-*',
      timeField: '@timestamp',
      aggregationFunction: 'avg',
      metricField: 'bytes',
    })!;
    const filteredEsql = buildChangePointEsql({
      indexPattern: 'logs-*',
      timeField: '@timestamp',
      aggregationFunction: 'avg',
      metricField: 'bytes',
      onlyChangePoints: true,
    })!;

    await waitFor(() => {
      expect(latestPreviewProps.previewKey).toContain(unfilteredEsql);
    });
    expect(screen.queryByTestId('aiopsChangePointOnlyDetectedSwitch')).toBeNull();

    // Switch to Table -> switch appears, defaulting to off
    fireEvent.click(screen.getByText('Table'));
    const onlyDetectedSwitch = screen.getByTestId('aiopsChangePointOnlyDetectedSwitch');
    expect(onlyDetectedSwitch).toHaveAttribute('aria-checked', 'false');
    expect(latestPreviewProps.previewKey).toBe(
      `${CHANGE_POINT_DETECTION_VIEW_TYPE.TABLE}:::${unfilteredEsql}`
    );

    // Enable the filter -> Table preview updates with | WHERE `type` IS NOT NULL
    fireEvent.click(onlyDetectedSwitch);
    expect(onlyDetectedSwitch).toHaveAttribute('aria-checked', 'true');
    expect(latestPreviewProps.previewKey).toBe(
      `${CHANGE_POINT_DETECTION_VIEW_TYPE.TABLE}:::${filteredEsql}`
    );

    // Switching to Charts hides the switch and keeps the Charts query unfiltered
    fireEvent.click(screen.getByText('Charts'));
    expect(screen.queryByTestId('aiopsChangePointOnlyDetectedSwitch')).toBeNull();
    expect(latestPreviewProps.previewKey).toBe(
      `${CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS}:::${unfilteredEsql}`
    );

    // Returning to Table restores the switch state and filtered query
    fireEvent.click(screen.getByText('Table'));
    expect(screen.getByTestId('aiopsChangePointOnlyDetectedSwitch')).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(latestPreviewProps.previewKey).toBe(
      `${CHANGE_POINT_DETECTION_VIEW_TYPE.TABLE}:::${filteredEsql}`
    );

    // Switching to query mode hides the switch and seeds the empty editor with the filtered Table query
    fireEvent.click(screen.getByText('Write a query'));
    expect(screen.queryByTestId('aiopsChangePointOnlyDetectedSwitch')).toBeNull();
    const editor = screen.getByTestId('aiopsChangePointEsqlEditor') as HTMLTextAreaElement;
    expect(editor.value).toBe(filteredEsql);

    // Return to Build with form and confirm Table submission
    fireEvent.click(screen.getByText('Build with form'));
    act(() => {
      latestPreviewProps.onStatusChange({
        key: latestPreviewProps.previewKey,
        status: 'ready',
      });
    });

    const confirmButton = screen.getByTestId('aiopsChangePointChartsInitializerConfirmButton');
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith({
      mode: 'form',
      viewType: CHANGE_POINT_DETECTION_VIEW_TYPE.TABLE,
      esql: filteredEsql,
      dataViewId: 'logs-dv',
      aggregationFunction: 'avg',
      metricField: 'bytes',
    });
  });
});
