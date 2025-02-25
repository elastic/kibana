/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
import { TimeRange } from '@kbn/es-query';
import { useKibana } from '../../hooks/use_kibana';
import { StreamsAppSearchBar, StreamsAppSearchBarProps } from '../streams_app_search_bar';
import { PreviewTable } from '../preview_table';
import { AssetImage } from '../asset_image';
import { useDateRange } from '../../hooks/use_date_range';
import { useSimulatorRef, useSimulatorSelector } from './services/stream_enrichment_service';
import { previewDocsFilterOptions } from './services/stream_enrichment_service/simulation_state_machine';

export const ProcessorOutcomePreview = () => {
  const { dependencies } = useKibana();
  const { data } = dependencies.start;

  const isLoading = useSimulatorSelector(
    (state) => state?.matches('loadingSamples') || state?.matches('runningSimulation')
  );

  const { timeRange, setTimeRange } = useDateRange({ data });

  return (
    <>
      <EuiFlexItem grow={false}>
        <OutcomeControls
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          onTimeRangeRefresh={() => {}}
        />
      </EuiFlexItem>
      <EuiSpacer size="m" />
      <OutcomePreviewTable />
      {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
    </>
  );
};

interface OutcomeControlsProps {
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  onTimeRangeRefresh: () => void;
}

const OutcomeControls = ({
  timeRange,
  onTimeRangeChange,
  onTimeRangeRefresh,
}: OutcomeControlsProps) => {
  const simulatorRef = useSimulatorRef();
  const previewDocsFilter = useSimulatorSelector((state) => state?.context.previewDocsFilter);
  const simulationFailureRate = useSimulatorSelector(
    (state) => state?.context.simulation?.failure_rate
  );
  const simulationSuccessRate = useSimulatorSelector(
    (state) => state?.context.simulation?.success_rate
  );

  const handleQuerySubmit: StreamsAppSearchBarProps['onQuerySubmit'] = (
    { dateRange },
    isUpdate
  ) => {
    if (!isUpdate) {
      return onTimeRangeRefresh();
    }

    if (dateRange) {
      onTimeRangeChange({
        from: dateRange.from,
        to: dateRange?.to,
        mode: dateRange.mode,
      });
    }
  };

  const getFilterButtonPropsFor = (filter: NonNullable<typeof previewDocsFilter>) => ({
    hasActiveFilters: previewDocsFilter === filter,
    onClick: () => simulatorRef?.send({ type: 'filters.changePreviewDocsFilter', filter }),
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
        onRefresh={onTimeRangeRefresh}
        dateRangeFrom={timeRange.from}
        dateRangeTo={timeRange.to}
      />
    </EuiFlexGroup>
  );
};

const OutcomePreviewTable = () => {
  const isMissingSamples = useSimulatorSelector((state) => state?.matches('missingSamples'));
  const previewDocuments = useSimulatorSelector((state) => state?.context.previewDocuments);
  const previewColumns = useSimulatorSelector((state) => state?.context.previewColumns);

  if (isMissingSamples || !previewDocuments) {
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

  return <PreviewTable documents={previewDocuments} displayColumns={previewColumns} />;
};
