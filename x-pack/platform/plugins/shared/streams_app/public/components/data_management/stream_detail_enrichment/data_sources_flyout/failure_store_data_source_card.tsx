/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import type { DataSourceActorRef } from '../state_management/data_source_state_machine';
import { DataSourceCard } from './data_source_card';
import { DATA_SOURCES_I18N } from './translations';
import { UncontrolledStreamsAppSearchBar } from '../../../streams_app_search_bar/uncontrolled_streams_app_bar';
import { useDataSourceSelector } from '../state_management/data_source_state_machine';
import type { FailureStoreDataSourceWithUIAttributes } from '../types';

interface FailureStoreDataSourceCardProps {
  readonly dataSourceRef: DataSourceActorRef;
}

const DEFAULT_TIME_RANGE: TimeRange = {
  from: 'now-15m',
  to: 'now',
};

export const FailureStoreDataSourceCard = ({ dataSourceRef }: FailureStoreDataSourceCardProps) => {
  const dataSource = useDataSourceSelector(
    dataSourceRef,
    (snapshot) => snapshot.context.dataSource as FailureStoreDataSourceWithUIAttributes
  );

  const isDisabled = useDataSourceSelector(
    dataSourceRef,
    (snapshot) => !snapshot.can({ type: 'dataSource.change', dataSource })
  );

  const handleChange = (params: Partial<FailureStoreDataSourceWithUIAttributes>) => {
    dataSourceRef.send({ type: 'dataSource.change', dataSource: { ...dataSource, ...params } });
  };

  const handleQuerySubmit = ({ dateRange }: { dateRange: TimeRange }) =>
    handleChange({
      timeRange: dateRange,
    });

  const handleAddTimeFilter = () => {
    handleChange({ timeRange: DEFAULT_TIME_RANGE });
  };

  const handleClearTimeFilter = () => {
    handleChange({ timeRange: undefined });
  };

  const hasTimeRange = Boolean(dataSource.timeRange);

  const timeFilterOptions = [
    {
      id: 'all',
      label: i18n.translate('xpack.streams.enrichment.dataSources.failureStore.allDocuments', {
        defaultMessage: 'All documents',
      }),
    },
    {
      id: 'time-range',
      label: i18n.translate('xpack.streams.enrichment.dataSources.failureStore.timeRange', {
        defaultMessage: 'Time range',
      }),
    },
  ];

  const handleTimeFilterToggle = (optionId: string) => {
    if (optionId === 'all') {
      handleClearTimeFilter();
    } else {
      handleAddTimeFilter();
    }
  };

  return (
    <DataSourceCard
      dataSourceRef={dataSourceRef}
      title={DATA_SOURCES_I18N.failureStore.defaultName}
      subtitle={DATA_SOURCES_I18N.failureStore.subtitle}
      isForCompleteSimulation
      data-test-subj="streamsAppFailureStoreDataSourceCard"
    >
      <EuiSpacer size="s" />

      <>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={i18n.translate(
                'xpack.streams.enrichment.dataSources.failureStore.timeFilterLegend',
                { defaultMessage: 'Time filter options' }
              )}
              options={timeFilterOptions}
              idSelected={hasTimeRange ? 'time-range' : 'all'}
              onChange={handleTimeFilterToggle}
              isDisabled={isDisabled}
              buttonSize="compressed"
              data-test-subj="streamsAppFailureStoreTimeFilterToggle"
            />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <UncontrolledStreamsAppSearchBar
              showFilterBar={false}
              showQueryInput={false}
              showDatePicker
              isDisabled={!hasTimeRange}
              dateRangeFrom={dataSource.timeRange?.from}
              dateRangeTo={dataSource.timeRange?.to}
              onQuerySubmit={handleQuerySubmit}
              dataTestSubj="streamsAppFailureStoreSearchBar"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
      <EuiSpacer size="m" />
    </DataSourceCard>
  );
};
