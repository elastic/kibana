/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import { Query, TimeRange } from '@kbn/es-query';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamEnrichmentSelector } from '../state_management/stream_enrichment_state_machine';
import {
  DataSourceActorRef,
  useDataSourceSelector,
} from '../state_management/data_source_state_machine';
import { KqlSamplesDataSourceWithUIAttributes } from '../types';
import { UncontrolledStreamsAppSearchBar } from '../../../streams_app_search_bar/uncontrolled_streams_app_bar';
import { DataSourceCard } from './data_source_card';
import { NameField } from './name_field';
import { DATA_SOURCES_I18N } from './translations';

interface KqlSamplesDataSourceCardProps {
  readonly dataSourceRef: DataSourceActorRef;
}

export const KqlSamplesDataSourceCard = ({ dataSourceRef }: KqlSamplesDataSourceCardProps) => {
  const { data } = useKibana().dependencies.start;

  const definition = useStreamEnrichmentSelector((state) => state.context.definition);
  const dataSource = useDataSourceSelector(
    dataSourceRef,
    (snapshot) => snapshot.context.dataSource as KqlSamplesDataSourceWithUIAttributes
  );

  const isDisabled = useDataSourceSelector(dataSourceRef, (snapshot) =>
    snapshot.matches('disabled')
  );

  const { value: streamDataView } = useAsync(() =>
    data.dataViews.create({
      title: definition.stream.name,
      timeFieldName: '@timestamp',
    })
  );

  const handleChange = (params: Partial<KqlSamplesDataSourceWithUIAttributes>) => {
    dataSourceRef.send({ type: 'dataSource.change', dataSource: { ...dataSource, ...params } });
  };

  const handleQueryChange = ({ query, dateRange }: { query?: Query; dateRange: TimeRange }) =>
    handleChange({
      query: query as KqlSamplesDataSourceWithUIAttributes['query'],
      timeRange: dateRange,
    });

  return (
    <DataSourceCard
      dataSourceRef={dataSourceRef}
      title={DATA_SOURCES_I18N.kqlDataSource.defaultName}
      subtitle={DATA_SOURCES_I18N.kqlDataSource.subtitle}
      isPreviewVisible
    >
      <NameField
        onChange={(event) => handleChange({ name: event.target.value })}
        value={dataSource.name}
        disabled={isDisabled}
      />
      <EuiSpacer />
      {streamDataView && (
        <>
          <UncontrolledStreamsAppSearchBar
            dateRangeFrom={dataSource.timeRange.from}
            dateRangeTo={dataSource.timeRange.to}
            filters={dataSource.filters}
            indexPatterns={[streamDataView]}
            isDisabled={isDisabled}
            onFiltersUpdated={(filters) => handleChange({ filters })}
            onQuerySubmit={handleQueryChange}
            query={dataSource.query}
            showDatePicker
            showFilterBar
            showQueryInput
          />
          <EuiSpacer size="s" />
        </>
      )}
    </DataSourceCard>
  );
};
