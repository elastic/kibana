/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { Required } from 'utility-types';
import type { FieldStatisticTableEmbeddableProps } from './types';
import type { ItemIdToExpandedRowMap } from '../../../common/components/stats_table';
import { DataVisualizerTable } from '../../../common/components/stats_table';
import type { FieldVisConfig } from '../../../common/components/stats_table/types';
import { getDefaultDataVisualizerListState } from '../../components/index_data_visualizer_view/index_data_visualizer_view';
import type { DataVisualizerTableState } from '../../../../../common/types';
import type { DataVisualizerIndexBasedAppState } from '../../types/index_data_visualizer_state';
import { IndexBasedDataVisualizerExpandedRow } from '../../../common/components/expanded_row/index_based_expanded_row';
import { useDataVisualizerGridData } from '../../hooks/use_data_visualizer_grid_data';
import { EmbeddableNoResultsEmptyPrompt } from './embeddable_field_stats_no_results';

const restorableDefaults = getDefaultDataVisualizerListState();

const EmbeddableFieldStatsTableWrapper = (
  props: Required<FieldStatisticTableEmbeddableProps, 'dataView'>
) => {
  const { onTableUpdate, onAddFilter, onRenderComplete } = props;

  const [dataVisualizerListState, setDataVisualizerListState] =
    useState<Required<DataVisualizerIndexBasedAppState>>(restorableDefaults);

  const onTableChange = useCallback(
    (update: DataVisualizerTableState) => {
      setDataVisualizerListState({ ...dataVisualizerListState, ...update });
      if (onTableUpdate) {
        onTableUpdate(update);
      }
    },
    [dataVisualizerListState, onTableUpdate]
  );

  const {
    configs,
    searchQueryLanguage,
    searchString,
    extendedColumns,
    progress,
    overallStats,
    overallStatsProgress,
    setLastRefresh,
  } = useDataVisualizerGridData(props, dataVisualizerListState);

  const totalCount = overallStats?.totalCount;

  useEffect(() => {
    setLastRefresh(Date.now());
  }, [props?.lastReloadRequestTime, setLastRefresh]);

  const getItemIdToExpandedRowMap = useCallback(
    function (itemIds: string[], items: FieldVisConfig[]): ItemIdToExpandedRowMap {
      return itemIds.reduce((m: ItemIdToExpandedRowMap, fieldName: string) => {
        const item = items.find((fieldVisConfig) => fieldVisConfig.fieldName === fieldName);
        if (item !== undefined) {
          m[fieldName] = (
            <IndexBasedDataVisualizerExpandedRow
              item={item}
              dataView={props.dataView}
              combinedQuery={{ searchQueryLanguage, searchString }}
              onAddFilter={onAddFilter}
              totalDocuments={props.totalDocuments}
            />
          );
        }
        return m;
      }, {} as ItemIdToExpandedRowMap);
    },
    [props.dataView, searchQueryLanguage, searchString, props.totalDocuments, onAddFilter]
  );

  useEffect(() => {
    if (progress === 100 && onRenderComplete) {
      onRenderComplete();
    }
  }, [progress, onRenderComplete]);

  if (progress === 100 && configs.length === 0) {
    return <EmbeddableNoResultsEmptyPrompt />;
  }
  return (
    <DataVisualizerTable<FieldVisConfig>
      items={configs}
      pageState={dataVisualizerListState}
      updatePageState={onTableChange}
      getItemIdToExpandedRowMap={getItemIdToExpandedRowMap}
      extendedColumns={extendedColumns}
      showPreviewByDefault={props?.showPreviewByDefault}
      onChange={onTableUpdate}
      loading={progress < 100}
      overallStatsRunning={overallStatsProgress.isRunning}
      totalCount={totalCount}
      renderFieldName={props.renderFieldName}
    />
  );
};

// exporting as default so it be lazy-loaded
// eslint-disable-next-line import/no-default-export
export default EmbeddableFieldStatsTableWrapper;
