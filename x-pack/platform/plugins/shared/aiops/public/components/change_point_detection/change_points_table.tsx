/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiEmptyPrompt,
  EuiInMemoryTable,
  type DefaultItemAction,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { EuiTableSelectionType } from '@elastic/eui/src/components/basic_table/table_types';
import { FilterStateStore, type Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTableState } from '@kbn/ml-in-memory-table';
import React, { useCallback, useEffect, useMemo, useRef, type FC } from 'react';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useDataSource } from '../../hooks/use_data_source';
import type { FieldConfig, SelectedChangePoint } from './change_point_detection_context';
import {
  useChangePointDetectionContext,
  type ChangePointAnnotation,
} from './change_point_detection_context';
import { type ChartComponentProps } from './chart_component';
import { NoDataFoundWarning } from './no_data_warning';
import { useCommonChartProps } from './use_common_chart_props';

export interface ChangePointsTableProps {
  annotations: ChangePointAnnotation[];
  fieldConfig: FieldConfig;
  isLoading: boolean;
  onSelectionChange?: (update: SelectedChangePoint[]) => void;
  onRenderComplete?: () => void;
}

function getFilterConfig(
  index: string,
  item: Required<ChangePointAnnotation>,
  negate: boolean
): Filter {
  return {
    meta: {
      disabled: false,
      negate,
      alias: null,
      index,
      key: `${item.group.name}_${item.group.value}`,
      // @ts-ignore FilterMeta type definition misses the field property
      field: item.group.name,
      params: {
        query: item.group.value,
      },
      type: 'phrase',
    },
    query: {
      match_phrase: {
        [item.group.name]: item.group.value,
      },
    },
    $state: {
      store: FilterStateStore.APP_STATE,
    },
  };
}

const pageSizeOptions = [5, 10, 15];

export const ChangePointsTable: FC<ChangePointsTableProps> = ({
  isLoading,
  annotations,
  fieldConfig,
  onSelectionChange,
  onRenderComplete,
}) => {
  const {
    fieldFormats,
    data: {
      query: { filterManager },
    },
    embeddingOrigin,
  } = useAiopsAppContext();
  const { dataView } = useDataSource();

  const chartLoadingCount = useRef<number>(0);

  const { onTableChange, pagination, sorting } = useTableState<ChangePointAnnotation>(
    annotations ?? [],
    'p_value',
    'asc',
    {
      pageIndex: 0,
      pageSize: 10,
      pageSizeOptions,
    }
  );

  const dateFormatter = useMemo(() => fieldFormats.deserialize({ id: 'date' }), [fieldFormats]);

  useEffect(() => {
    // Reset loading counter on pagination or sort change
    chartLoadingCount.current = 0;
  }, [pagination.pageIndex, pagination.pageSize, sorting.sort]);

  /**
   * Callback to track render of each chart component
   * to report when all charts on the current page are ready.
   */
  const onChartRenderCompleteCallback = useCallback(
    (isLoadingChart: boolean) => {
      if (!onRenderComplete) return;
      if (!isLoadingChart) {
        chartLoadingCount.current++;
      }
      if (chartLoadingCount.current === pagination.pageSize) {
        onRenderComplete();
      }
    },
    [onRenderComplete, pagination.pageSize]
  );

  const isDashboardEmbedding = embeddingOrigin === 'dashboard';
  const hasActions = fieldConfig.splitField !== undefined && embeddingOrigin !== 'cases';

  const { bucketInterval } = useChangePointDetectionContext();

  // Prevents timestamp and p-value cells from wrapping excessively in narrow tables,
  // which would make the values unreadable. Capped at 3 lines as a safe maximum.
  const lineClampStyle: React.CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  const columns: Array<EuiBasicTableColumn<ChangePointAnnotation>> = [
    {
      id: 'timestamp',
      field: 'timestamp',
      'data-test-subj': 'aiopsChangePointTimestamp',
      name: i18n.translate('xpack.aiops.changePointDetection.timeColumn', {
        defaultMessage: 'Time',
      }),
      dataType: 'date',
      sortable: true,
      truncateText: false,
      render: (timestamp: ChangePointAnnotation['timestamp']) => (
        <span style={isDashboardEmbedding ? lineClampStyle : undefined}>
          {dateFormatter.convert(timestamp)}
        </span>
      ),
      width: isDashboardEmbedding ? '180px' : '20%',
    },
    {
      id: 'preview',
      'data-test-subj': 'aiopsChangePointPreview',
      name: i18n.translate('xpack.aiops.changePointDetection.previewColumn', {
        defaultMessage: 'Preview',
      }),
      align: 'center',
      width: '200px',
      height: '80px',
      truncateText: false,
      valign: 'middle',
      css: {
        '.euiTableCellContent': { display: 'block', padding: 0 },
      },
      render: (annotation: ChangePointAnnotation) => {
        return (
          <MiniChartPreview
            annotation={annotation}
            fieldConfig={fieldConfig}
            interval={bucketInterval.expression}
            onRenderComplete={onChartRenderCompleteCallback.bind(null, false)}
          />
        );
      },
    },
    {
      id: 'type',
      'data-test-subj': 'aiopsChangePointType',
      field: 'type',
      name: i18n.translate('xpack.aiops.changePointDetection.typeColumn', {
        defaultMessage: 'Type',
      }),
      sortable: true,
      truncateText: true,
      render: (type: ChangePointAnnotation['type']) => <EuiBadge color="hollow">{type}</EuiBadge>,
      width: isDashboardEmbedding ? '130px' : '15%',
    },
    {
      id: 'pValue',
      'data-test-subj': 'aiopsChangePointPValue',
      field: 'p_value',
      name: i18n.translate('xpack.aiops.changePointDetection.pValueColumn', {
        defaultMessage: 'p-value',
      }),
      nameTooltip: {
        content: i18n.translate('xpack.aiops.changePointDetection.pValueTooltip', {
          defaultMessage:
            'Indicates how extreme the change is. Lower values indicate greater change.',
        }),
      },
      sortable: true,
      truncateText: false,
      render: (pValue: ChangePointAnnotation['p_value']) => (
        <span style={isDashboardEmbedding ? lineClampStyle : undefined}>
          {pValue !== undefined ? pValue.toPrecision(3) : '-'}
        </span>
      ),
      width: isDashboardEmbedding ? '120px' : '15%',
    },
    ...(fieldConfig.splitField
      ? [
          {
            id: 'groupValue',
            'data-test-subj': 'aiopsChangePointGroupValue',
            field: 'group.value',
            name: fieldConfig.splitField,
            truncateText: false,
            sortable: true,
            width: isDashboardEmbedding ? '120px' : '15%',
            render: (value: string) => (
              <span style={isDashboardEmbedding ? lineClampStyle : undefined}>{value}</span>
            ),
          },
          ...(hasActions
            ? [
                {
                  name: i18n.translate('xpack.aiops.changePointDetection.actionsColumn', {
                    defaultMessage: 'Actions',
                  }),
                  actions: [
                    {
                      name: i18n.translate(
                        'xpack.aiops.changePointDetection.actions.filterForValueAction',
                        {
                          defaultMessage: 'Filter for value',
                        }
                      ),
                      description: i18n.translate(
                        'xpack.aiops.changePointDetection.actions.filterForValueAction',
                        {
                          defaultMessage: 'Filter for value',
                        }
                      ),
                      icon: 'plusCircle',
                      color: 'primary',
                      type: 'icon',
                      onClick: (item) => {
                        filterManager.addFilters(
                          getFilterConfig(
                            dataView.id!,
                            item as Required<ChangePointAnnotation>,
                            false
                          )!
                        );
                      },
                      isPrimary: true,
                      'data-test-subj': 'aiopsChangePointFilterForValue',
                    },
                    {
                      name: i18n.translate(
                        'xpack.aiops.changePointDetection.actions.filterOutValueAction',
                        {
                          defaultMessage: 'Filter out value',
                        }
                      ),
                      description: i18n.translate(
                        'xpack.aiops.changePointDetection.actions.filterOutValueAction',
                        {
                          defaultMessage: 'Filter out value',
                        }
                      ),
                      icon: 'minusCircle',
                      color: 'primary',
                      type: 'icon',
                      onClick: (item) => {
                        filterManager.addFilters(
                          getFilterConfig(
                            dataView.id!,
                            item as Required<ChangePointAnnotation>,
                            true
                          )!
                        );
                      },
                      isPrimary: true,
                      'data-test-subj': 'aiopsChangePointFilterOutValue',
                    },
                  ] as Array<DefaultItemAction<ChangePointAnnotation>>,
                },
              ]
            : []),
        ]
      : []),
  ];

  const selectionValue = useMemo<EuiTableSelectionType<ChangePointAnnotation> | undefined>(() => {
    if (!onSelectionChange) return;
    return {
      selectable: (item) => true,
      onSelectionChange: (selection) => {
        onSelectionChange!(
          selection.map((s) => {
            return {
              ...s,
              ...fieldConfig,
            };
          })
        );
      },
    };
  }, [fieldConfig, onSelectionChange]);

  return (
    <EuiInMemoryTable<ChangePointAnnotation>
      tableLayout={isDashboardEmbedding ? 'auto' : 'fixed'}
      tableCaption={i18n.translate('xpack.aiops.changePointDetection.resultsTableCaption', {
        defaultMessage: 'Change point detection results',
      })}
      itemId="id"
      selection={selectionValue}
      loading={isLoading}
      data-test-subj={`aiopsChangePointResultsTable ${isLoading ? 'loading' : 'loaded'}`}
      items={annotations}
      columns={columns}
      pagination={
        pagination.pageSizeOptions![0] > pagination!.totalItemCount ? undefined : pagination
      }
      sorting={sorting}
      onTableChange={onTableChange}
      rowProps={(item) => ({
        'data-test-subj': `aiopsChangePointResultsTableRow row-${item.id}`,
      })}
      noItemsMessage={
        isLoading ? (
          <EuiEmptyPrompt
            iconType="magnify"
            title={
              <h3>
                <FormattedMessage
                  id="xpack.aiops.changePointDetection.fetchingChangePointsTitle"
                  defaultMessage="Fetching change points..."
                />
              </h3>
            }
            titleSize="xs"
          />
        ) : (
          <NoDataFoundWarning />
        )
      }
    />
  );
};

export const MiniChartPreview: FC<ChartComponentProps> = ({
  fieldConfig,
  annotation,
  onRenderComplete,
  onLoading,
}) => {
  const {
    lens: { EmbeddableComponent },
  } = useAiopsAppContext();

  const { bucketInterval } = useChangePointDetectionContext();

  const { filters, query, attributes, timeRange } = useCommonChartProps({
    annotation,
    fieldConfig,
    previewMode: true,
    bucketInterval: bucketInterval.expression,
  });

  const chartWrapperRef = useRef<HTMLDivElement>(null);

  const renderCompleteListener = useCallback(
    (event: Event) => {
      if (event.target === chartWrapperRef.current) return;
      if (onRenderComplete) {
        onRenderComplete();
      }
    },
    [onRenderComplete]
  );

  useEffect(() => {
    if (!chartWrapperRef.current) {
      throw new Error('Reference to the chart wrapper is not set');
    }
    const chartWrapper = chartWrapperRef.current;
    chartWrapper.addEventListener('renderComplete', renderCompleteListener);
    return () => {
      chartWrapper.removeEventListener('renderComplete', renderCompleteListener);
    };
  }, [renderCompleteListener]);

  return (
    <div data-test-subj={'aiopChangePointPreviewChart'} ref={chartWrapperRef}>
      <EmbeddableComponent
        id={`mini_changePointChart_${annotation.group ? annotation.group.value : annotation.label}`}
        style={{ height: 80 }}
        timeRange={timeRange}
        noPadding
        query={query}
        filters={filters}
        // @ts-ignore
        attributes={attributes}
        renderMode={'preview'}
        executionContext={{
          type: 'aiops_change_point_detection_chart',
          name: 'Change point detection',
        }}
        onLoad={onLoading}
      />
    </div>
  );
};
