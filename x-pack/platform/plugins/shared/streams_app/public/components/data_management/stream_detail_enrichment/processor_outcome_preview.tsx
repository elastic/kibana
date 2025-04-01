/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFilterButton,
  EuiFilterGroup,
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiSpacer,
  EuiProgress,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelector } from '@xstate5/react';
import { isEmpty, isEqual } from 'lodash';
import { StreamsAppSearchBar, StreamsAppSearchBarProps } from '../../streams_app_search_bar';
import { PreviewTable } from '../preview_table';
import { AssetImage } from '../../asset_image';
import {
  useSimulatorSelector,
  useStreamEnrichmentEvents,
} from './state_management/stream_enrichment_state_machine';
import {
  PreviewDocsFilterOption,
  getTableColumns,
  previewDocsFilterOptions,
} from './state_management/simulation_state_machine';

export const ProcessorOutcomePreview = () => {
  const isLoading = useSimulatorSelector(
    (state) =>
      state.matches('debouncingChanges') ||
      state.matches('loadingSamples') ||
      state.matches('runningSimulation')
  );

  return (
    <>
      <EuiFlexItem grow={false}>
        <OutcomeControls />
      </EuiFlexItem>
      <EuiSpacer size="m" />
      <OutcomePreviewTable />
      {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
    </>
  );
};

const OutcomeControls = () => {
  const { changePreviewDocsFilter } = useStreamEnrichmentEvents();

  const previewDocsFilter = useSimulatorSelector((state) => state.context.previewDocsFilter);
  const simulationFailureRate = useSimulatorSelector((state) =>
    state.context.simulation
      ? state.context.simulation.failure_rate + state.context.simulation.skipped_rate
      : undefined
  );
  const simulationSuccessRate = useSimulatorSelector(
    (state) => state.context.simulation?.success_rate
  );

  const dateRangeRef = useSimulatorSelector((state) => state.context.dateRangeRef);
  const timeRange = useSelector(dateRangeRef, (state) => state.context.timeRange);
  const handleRefresh = () => dateRangeRef.send({ type: 'dateRange.refresh' });

  const handleQuerySubmit: StreamsAppSearchBarProps['onQuerySubmit'] = (
    { dateRange },
    isUpdate
  ) => {
    if (!isUpdate) {
      return handleRefresh();
    }

    if (dateRange) {
      dateRangeRef.send({ type: 'dateRange.update', range: dateRange });
    }
  };

  const getFilterButtonPropsFor = (filter: PreviewDocsFilterOption) => ({
    hasActiveFilters: previewDocsFilter === filter,
    onClick: () => changePreviewDocsFilter(filter),
  });

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
      <EuiFilterGroup
        aria-label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControlsAriaLabel',
          { defaultMessage: 'Filter for all, matching or unmatching previewed documents.' }
        )}
      >
        <EuiFilterButton
          {...getFilterButtonPropsFor(previewDocsFilterOptions.outcome_filter_all.id)}
        >
          {previewDocsFilterOptions.outcome_filter_all.label}
        </EuiFilterButton>
        <EuiFilterButton
          {...getFilterButtonPropsFor(previewDocsFilterOptions.outcome_filter_matched.id)}
          badgeColor="success"
          numActiveFilters={
            simulationSuccessRate ? parseFloat((simulationSuccessRate * 100).toFixed(2)) : undefined
          }
        >
          {previewDocsFilterOptions.outcome_filter_matched.label}
        </EuiFilterButton>
        <EuiFilterButton
          {...getFilterButtonPropsFor(previewDocsFilterOptions.outcome_filter_unmatched.id)}
          badgeColor="accent"
          numActiveFilters={
            simulationFailureRate ? parseFloat((simulationFailureRate * 100).toFixed(2)) : undefined
          }
        >
          {previewDocsFilterOptions.outcome_filter_unmatched.label}
        </EuiFilterButton>
      </EuiFilterGroup>
      <StreamsAppSearchBar
        onQuerySubmit={handleQuerySubmit}
        onRefresh={handleRefresh}
        dateRangeFrom={timeRange?.from}
        dateRangeTo={timeRange?.to}
      />
    </EuiFlexGroup>
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
  const previewDocuments = useSimulatorSelector((state) => state.context.previewDocuments);

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
