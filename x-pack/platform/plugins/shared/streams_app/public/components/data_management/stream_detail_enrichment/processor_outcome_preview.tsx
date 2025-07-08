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
  EuiFlexItem,
  EuiFlexGroup,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { Sample } from '@kbn/grok-ui';
import { GrokProcessorDefinition } from '@kbn/streams-schema';
import { PreviewTable } from '../preview_table';
import {
  useSimulatorSelector,
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import {
  PreviewDocsFilterOption,
  getTableColumns,
  previewDocsFilterOptions,
} from './state_management/simulation_state_machine';
import { selectPreviewDocuments } from './state_management/simulation_state_machine/selectors';
import { isGrokProcessor } from './utils';
import { selectDraftProcessor } from './state_management/stream_enrichment_state_machine/selectors';
import { WithUIAttributes } from './types';

export const ProcessorOutcomePreview = () => {
  const isLoading = useSimulatorSelector(
    (snapshot) => snapshot.matches('debouncingChanges') || snapshot.matches('runningSimulation')
  );
  const previewDocuments = useSimulatorSelector((snapshot) =>
    selectPreviewDocuments(snapshot.context)
  );

  const areDataSourcesLoading = useStreamEnrichmentSelector((state) =>
    state.context.dataSourcesRefs.some((ref) => {
      const snap = ref.getSnapshot();
      return (
        snap.matches({ enabled: 'loadingData' }) || snap.matches({ enabled: 'debouncingChanges' })
      );
    })
  );

  if (isEmpty(previewDocuments)) {
    if (areDataSourcesLoading) {
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <EuiEmptyPrompt
        color="warning"
        iconType="warning"
        titleSize="s"
        title={
          <h2>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomePreviewTable.noDataTitle',
              { defaultMessage: 'No data available to validate processor changes' }
            )}
          </h2>
        }
        body={
          <p>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomePreviewTable.noDataBody',
              {
                defaultMessage:
                  'Changes will be applied, but we can’t confirm they’ll work as expected. Proceed with caution.',
              }
            )}
          </p>
        }
      />
    );
  }

  return (
    <>
      <EuiFlexItem grow={false}>
        <PreviewDocumentsGroupBy />
      </EuiFlexItem>
      <EuiSpacer size="m" />
      <OutcomePreviewTable />
      {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
    </>
  );
};

const formatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
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
    isToggle: previewDocsFilter === filter,
    isSelected: previewDocsFilter === filter,
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
    </EuiFlexGroup>
  );
};

const OutcomePreviewTable = () => {
  const processors = useSimulatorSelector((state) => state.context.processors);
  const detectedFields = useSimulatorSelector((state) => state.context.simulation?.detected_fields);
  const previewDocsFilter = useSimulatorSelector((state) => state.context.previewDocsFilter);
  const previewColumnsSorting = useSimulatorSelector(
    (state) => state.context.previewColumnsSorting
  );
  const explicitlyEnabledPreviewColumns = useSimulatorSelector(
    (state) => state.context.explicitlyEnabledPreviewColumns
  );
  const explicitlyDisabledPreviewColumns = useSimulatorSelector(
    (state) => state.context.explicitlyDisabledPreviewColumns
  );
  const previewColumnsOrder = useSimulatorSelector((state) => state.context.previewColumnsOrder);
  const previewDocuments = useSimulatorSelector((snapshot) =>
    selectPreviewDocuments(snapshot.context)
  );

  const {
    setExplicitlyEnabledPreviewColumns,
    setExplicitlyDisabledPreviewColumns,
    setPreviewColumnsOrder,
    setPreviewColumnsSorting,
  } = useStreamEnrichmentEvents();

  const allColumns = useMemo(() => {
    // Get all fields from the preview documents
    const fields = new Set<string>();
    previewDocuments.forEach((doc) => {
      Object.keys(doc).forEach((key) => {
        fields.add(key);
      });
    });
    return Array.from(fields);
  }, [previewDocuments]);

  const draftProcessor = useStreamEnrichmentSelector((snapshot) =>
    selectDraftProcessor(snapshot.context)
  );

  const grokCollection = useStreamEnrichmentSelector(
    (machineState) => machineState.context.grokCollection
  );

  const grokMode =
    draftProcessor?.processor &&
    isGrokProcessor(draftProcessor.processor) &&
    !isEmpty(draftProcessor.processor.grok.field) &&
    // NOTE: If a Grok expression attempts to overwrite the configured field (non-additive change) we defer to the standard preview table showing all columns
    !draftProcessor.resources?.grokExpressions.some((grokExpression) => {
      if (draftProcessor.processor && !isGrokProcessor(draftProcessor.processor)) return false;
      const fieldName = draftProcessor.processor?.grok.field;
      return Array.from(grokExpression.getFields().values()).some(
        (field) => field.name === fieldName
      );
    });

  const grokField = grokMode
    ? (draftProcessor.processor as WithUIAttributes<GrokProcessorDefinition>).grok.field
    : undefined;

  const previewColumns = useMemo(() => {
    let cols = getTableColumns(processors, detectedFields ?? [], previewDocsFilter);
    if (grokField) {
      // If we are in Grok mode, we exclude the detected fields and only use the Grok field
      // sine it is highlighting extracted values
      cols = [grokField];
    }
    if (cols.length === 0) {
      // If no columns are detected, we fall back to all fields from the preview documents
      cols = allColumns;
    }
    // Filter out columns that are explicitly disabled
    const filteredCols = cols.filter((col) => !explicitlyDisabledPreviewColumns.includes(col));
    // Add explicitly enabled columns if they are not already included and exist in allFields
    explicitlyEnabledPreviewColumns.forEach((col) => {
      if (!filteredCols.includes(col) && allColumns.includes(col)) {
        filteredCols.push(col);
      }
    });
    return filteredCols;
  }, [
    allColumns,
    detectedFields,
    explicitlyDisabledPreviewColumns,
    explicitlyEnabledPreviewColumns,
    grokField,
    previewDocsFilter,
    processors,
  ]);

  const setVisibleColumns = (visibleColumns: string[]) => {
    if (visibleColumns.length === 0) {
      // If no columns are visible, we reset the explicitly enabled and disabled columns
      setExplicitlyDisabledPreviewColumns(allColumns);
      return;
    }
    // find which columns got added or removed comparing visibleColumns with the current displayColumns
    const addedColumns = visibleColumns.filter((col) => !previewColumns.includes(col));
    if (addedColumns.length > 0) {
      setExplicitlyEnabledPreviewColumns([
        ...explicitlyEnabledPreviewColumns,
        ...addedColumns.filter((col) => !explicitlyEnabledPreviewColumns.includes(col)),
      ]);
    }
    const removedColumns = previewColumns.filter((col) => !visibleColumns.includes(col));
    if (removedColumns.length > 0) {
      setExplicitlyDisabledPreviewColumns([
        ...explicitlyDisabledPreviewColumns,
        ...removedColumns.filter((col) => !explicitlyDisabledPreviewColumns.includes(col)),
      ]);
    }
    setPreviewColumnsOrder(visibleColumns);
  };

  return (
    <PreviewTable
      documents={previewDocuments}
      displayColumns={previewColumns}
      rowHeightsOptions={grokMode ? { defaultHeight: 'auto' } : undefined}
      toolbarVisibility
      setVisibleColumns={setVisibleColumns}
      sorting={previewColumnsSorting}
      setSorting={setPreviewColumnsSorting}
      columnOrderHint={previewColumnsOrder}
      renderCellValue={
        grokMode
          ? (document, columnId) => {
              const value = document[columnId];
              if (typeof value === 'string' && columnId === grokField) {
                return (
                  <Sample
                    grokCollection={grokCollection}
                    draftGrokExpressions={draftProcessor.resources?.grokExpressions ?? []}
                    sample={value}
                  />
                );
              } else {
                return undefined;
              }
            }
          : undefined
      }
    />
  );
};
