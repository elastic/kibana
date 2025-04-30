/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiEmptyPrompt,
  EuiSpacer,
  EuiProgress,
} from '@elastic/eui';
import { isEmpty, isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import useAsync from 'react-use/lib/useAsync';
import { useKibana } from '../../../hooks/use_kibana';
import { PreviewTable } from '../preview_table';
import { AssetImage } from '../../asset_image';
import {
  useSimulatorSelector,
  useStreamEnrichmentEvents,
  useStreamsEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import {
  PreviewDocsFilterOption,
  getTableColumns,
  previewDocsFilterOptions,
} from './state_management/simulation_state_machine';
import { selectPreviewDocuments } from './state_management/simulation_state_machine/selectors';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';

export const ProcessorOutcomePreview = () => {
  const isLoading = useSimulatorSelector(
    (state) =>
      state.matches('debouncingChanges') ||
      state.matches('loadingSamples') ||
      state.matches('runningSimulation')
  );

  return (
    <>
      <div>
        <PreviedDocumentsSearchBar />
        <EuiSpacer size="s" />
        <PreviewDocumentsGroupBy />
      </div>
      <EuiSpacer size="m" />
      <OutcomePreviewTable />
      {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
    </>
  );
};

const PreviedDocumentsSearchBar = () => {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();
  const definition = useStreamsEnrichmentSelector((state) => state.context.definition);
  const search = useSimulatorSelector((state) => state.context.search);
  const { changeSearchParams } = useStreamEnrichmentEvents();

  const { value: streamDataView } = useAsync(() =>
    data.dataViews.create({
      title: definition.stream.name,
      timeFieldName: '@timestamp',
    })
  );

  return (
    streamDataView && (
      <StreamsAppSearchBar
        showDatePicker
        showFilterBar
        showQueryInput
        filters={search.filters}
        query={search.query}
        isRefreshPaused={search.refreshInterval.pause}
        refreshInterval={search.refreshInterval.value}
        onFiltersUpdated={(filters) => changeSearchParams({ filters })}
        onQuerySubmit={({ query, dateRange }) => changeSearchParams({ query, time: dateRange })}
        onRefresh={() => changeSearchParams({})}
        onRefreshChange={({ isPaused, refreshInterval }) => {
          changeSearchParams({ refreshInterval: { pause: isPaused, value: refreshInterval } });
        }}
        indexPatterns={[streamDataView]}
      />
    )
  );
};

const formatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
});

const formatRateToPercentage = (rate?: number) =>
  (rate ? formatter.format(rate) : undefined) as any; // This is a workaround for the type error, since the numFilters & numActiveFilters props are defined as number | undefined

const PreviewDocumentsGroupBy = () => {
  const { changePreviewDocsFilter } = useStreamEnrichmentEvents();

  const previewDocsFilter = useSimulatorSelector((state) => state.context.previewDocsFilter);
  const simulationFailedRate = useSimulatorSelector((state) =>
    formatRateToPercentage(state.context.simulation?.documents_metrics.failed_rate)
  );
  const simulationSkippedRate = useSimulatorSelector((state) =>
    formatRateToPercentage(state.context.simulation?.documents_metrics.skipped_rate)
  );
  const simulationPartiallyParsedRate = useSimulatorSelector((state) =>
    formatRateToPercentage(state.context.simulation?.documents_metrics.partially_parsed_rate)
  );
  const simulationParsedRate = useSimulatorSelector((state) =>
    formatRateToPercentage(state.context.simulation?.documents_metrics.parsed_rate)
  );

  const getFilterButtonPropsFor = (filter: PreviewDocsFilterOption) => ({
    hasActiveFilters: previewDocsFilter === filter,
    onClick: () => changePreviewDocsFilter(filter),
  });

  return (
    <EuiFilterGroup
      aria-label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControlsAriaLabel',
        { defaultMessage: 'Filter for all, matching or unmatching previewed documents.' }
      )}
    >
      <EuiFilterButton {...getFilterButtonPropsFor(previewDocsFilterOptions.outcome_filter_all.id)}>
        {previewDocsFilterOptions.outcome_filter_all.label}
      </EuiFilterButton>
      <EuiFilterButton
        {...getFilterButtonPropsFor(previewDocsFilterOptions.outcome_filter_parsed.id)}
        badgeColor="success"
        numFilters={simulationParsedRate}
        numActiveFilters={simulationParsedRate}
      >
        {previewDocsFilterOptions.outcome_filter_parsed.label}
      </EuiFilterButton>
      <EuiFilterButton
        {...getFilterButtonPropsFor(previewDocsFilterOptions.outcome_filter_partially_parsed.id)}
        badgeColor="accent"
        numFilters={simulationPartiallyParsedRate}
        numActiveFilters={simulationPartiallyParsedRate}
      >
        {previewDocsFilterOptions.outcome_filter_partially_parsed.label}
      </EuiFilterButton>
      <EuiFilterButton
        {...getFilterButtonPropsFor(previewDocsFilterOptions.outcome_filter_skipped.id)}
        badgeColor="accent"
        numFilters={simulationSkippedRate}
        numActiveFilters={simulationSkippedRate}
      >
        {previewDocsFilterOptions.outcome_filter_skipped.label}
      </EuiFilterButton>
      <EuiFilterButton
        {...getFilterButtonPropsFor(previewDocsFilterOptions.outcome_filter_failed.id)}
        badgeColor="accent"
        numFilters={simulationFailedRate}
        numActiveFilters={simulationFailedRate}
      >
        {previewDocsFilterOptions.outcome_filter_failed.label}
      </EuiFilterButton>
    </EuiFilterGroup>
  );
};

const MemoPreviewTable = React.memo(PreviewTable, (prevProps, nextProps) => {
  // Need to specify the props to compare since the columns might be the same even if the useMemo call returns a new array
  return (
    prevProps.documents === nextProps.documents &&
    isEqual(prevProps.displayColumns, nextProps.displayColumns)
  );
});

const OutcomePreviewTable = () => {
  const processors = useSimulatorSelector((state) => state.context.processors);
  const detectedFields = useSimulatorSelector((state) => state.context.simulation?.detected_fields);
  const previewDocsFilter = useSimulatorSelector((state) => state.context.previewDocsFilter);
  const previewDocuments = useSimulatorSelector((snapshot) =>
    selectPreviewDocuments(snapshot.context)
  );

  const previewColumns = useMemo(
    () => getTableColumns(processors, detectedFields ?? [], previewDocsFilter),
    [detectedFields, previewDocsFilter, processors]
  );

  if (!previewDocuments || isEmpty(previewDocuments)) {
    return (
      <EuiEmptyPrompt
        titleSize="xs"
        icon={<AssetImage type="noResults" />}
        title={
          <h2>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.rootStreamEmptyPrompt.noDataTitle',
              { defaultMessage: 'Unable to generate a preview' }
            )}
          </h2>
        }
        body={
          <p>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomePreviewTable.noDataBody',
              {
                defaultMessage:
                  "There are no sample documents to test the processors. Try updating the time range or ingesting more data, it might be possible we could not find any matching documents with the processors' source fields.",
              }
            )}
          </p>
        }
      />
    );
  }

  return <MemoPreviewTable documents={previewDocuments} displayColumns={previewColumns} />;
};
