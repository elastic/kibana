/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridRowHeightsOptions } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GrokProcessor } from '@kbn/streamlang';
import { isActionBlock } from '@kbn/streamlang';
import type { FlattenRecord, SampleDocument } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import React, { useCallback, useEffect, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  useGrokExpressions,
  GrokExpressionsProvider,
  GrokSampleWithContext,
  type DraftGrokExpression,
  type FieldDefinition,
} from '@kbn/grok-ui';
import { useDocViewerSetup } from '../../../hooks/use_doc_viewer_setup';
import { useDocumentExpansion } from '../../../hooks/use_document_expansion';
import { useStreamDataViewFieldTypes } from '../../../hooks/use_stream_data_view_field_types';
import { getPercentageFormatter } from '../../../util/formatters';
import { MemoPreviewTable, PreviewFlyout, type PreviewTableMode } from '../shared';
import { RowSelectionContext } from '../shared/preview_table';
import { toDataTableRecordWithIndex } from '../stream_detail_routing/utils';
import { DOC_VIEW_DIFF_ID, DocViewerContext } from './doc_viewer_diff';
import {
  NoPreviewDocumentsEmptyPrompt,
  NoProcessingDataAvailableEmptyPrompt,
} from './empty_prompts';
import { useDataSourceSelector } from './state_management/data_source_state_machine';
import { selectDraftProcessor } from './state_management/interactive_mode_machine/selectors';
import type { PreviewDocsFilterOption } from './state_management/simulation_state_machine';
import {
  getAllFieldsInOrder,
  getOriginalSampleDocument,
  getSourceField,
  getTableColumns,
  previewDocsFilterOptions,
} from './state_management/simulation_state_machine';
import {
  selectHasSimulatedRecords,
  selectOriginalPreviewRecords,
  selectPreviewRecords,
  selectSamplesForSimulation,
} from './state_management/simulation_state_machine/selectors';
import { isStepUnderEdit } from './state_management/steps_state_machine';
import {
  useSimulatorSelector,
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import { selectIsInteractiveMode } from './state_management/stream_enrichment_state_machine/selectors';
import { getActiveDataSourceRef } from './state_management/stream_enrichment_state_machine/utils';

export const ProcessorOutcomePreview = () => {
  const samples = useSimulatorSelector((snapshot) => snapshot.context.samples);
  const previewDocuments = useSimulatorSelector((snapshot) =>
    selectPreviewRecords(snapshot.context)
  );

  const activeDataSourceRef = useStreamEnrichmentSelector((snapshot) =>
    getActiveDataSourceRef(snapshot.context.dataSourcesRefs)
  );

  const isDataSourceLoading = useDataSourceSelector(activeDataSourceRef, (snapshot) =>
    snapshot ? snapshot.matches({ enabled: 'loadingData' }) : false
  );

  if (isEmpty(samples)) {
    if (isDataSourceLoading) {
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return <NoProcessingDataAvailableEmptyPrompt />;
  }

  return (
    <>
      <EuiFlexItem grow={false}>
        <PreviewDocumentsGroupBy />
      </EuiFlexItem>
      <EuiSpacer size="m" />
      {isEmpty(previewDocuments) ? (
        <NoPreviewDocumentsEmptyPrompt />
      ) : (
        <OutcomePreviewTable previewDocuments={previewDocuments} />
      )}
    </>
  );
};

const formatter = getPercentageFormatter();

const formatRateToPercentage = (rate?: number) => (rate ? formatter.format(rate) : undefined);

const PreviewDocumentsGroupBy = () => {
  const { changePreviewDocsFilter, clearSimulationConditionFilter: clearConditionFilter } =
    useStreamEnrichmentEvents();

  const previewDocsFilter = useSimulatorSelector((state) => state.context.previewDocsFilter);
  const hasMetrics = useSimulatorSelector((state) => !!state.context.simulation?.documents_metrics);
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
  const simulationDroppedRate = useSimulatorSelector((state) =>
    formatRateToPercentage(state.context.simulation?.documents_metrics.dropped_rate)
  );
  const selectedConditionId = useSimulatorSelector((state) => state.context.selectedConditionId);
  const totalSamples = useSimulatorSelector((state) => state.context.samples.length);
  const activeSamples = useSimulatorSelector(
    (state) => selectSamplesForSimulation(state.context).length
  );
  const conditionPercentage =
    totalSamples > 0 ? Math.round((activeSamples / totalSamples) * 100) : 0;

  const getFilterButtonPropsFor = (filter: PreviewDocsFilterOption) => ({
    isToggle: previewDocsFilter === filter,
    isSelected: previewDocsFilter === filter,
    disabled: !hasMetrics,
    hasActiveFilters: previewDocsFilter === filter,
    onClick: () => changePreviewDocsFilter(filter),
  });

  return (
    <EuiFlexGroup alignItems="center" justifyContent="flexStart" wrap gutterSize="m">
      {selectedConditionId && (
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={clearConditionFilter}
            iconType="cross"
            iconSide="right"
            size="s"
            color="text"
            data-test-subj="streamsAppConditionFilterButton"
          >
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiText size="s">{selectedButtonLabel}</EuiText>
              <EuiBadge data-test-subj="streamsAppConditionFilterSelectedBadge">
                {`${conditionPercentage}%`}
              </EuiBadge>
            </EuiFlexGroup>
          </EuiButton>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiFilterGroup
          compressed={true}
          aria-label={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControlsAriaLabel',
            { defaultMessage: 'Filter for all, matching or unmatching previewed documents.' }
          )}
        >
          <EuiToolTip
            content={previewDocsFilterOptions.outcome_filter_all.tooltip}
            key={previewDocsFilterOptions.outcome_filter_all.id}
          >
            <EuiFilterButton
              {...getFilterButtonPropsFor(previewDocsFilterOptions.outcome_filter_all.id)}
            >
              {previewDocsFilterOptions.outcome_filter_all.label}
            </EuiFilterButton>
          </EuiToolTip>
          <EuiToolTip
            content={previewDocsFilterOptions.outcome_filter_parsed.tooltip}
            key={previewDocsFilterOptions.outcome_filter_parsed.id}
          >
            <EuiFilterButton
              {...getFilterButtonPropsFor(previewDocsFilterOptions.outcome_filter_parsed.id)}
              badgeColor="success"
              numActiveFilters={simulationParsedRate}
            >
              {previewDocsFilterOptions.outcome_filter_parsed.label}
            </EuiFilterButton>
          </EuiToolTip>
          <EuiToolTip
            content={previewDocsFilterOptions.outcome_filter_partially_parsed.tooltip}
            key={previewDocsFilterOptions.outcome_filter_partially_parsed.id}
          >
            <EuiFilterButton
              {...getFilterButtonPropsFor(
                previewDocsFilterOptions.outcome_filter_partially_parsed.id
              )}
              badgeColor="accent"
              numActiveFilters={simulationPartiallyParsedRate}
            >
              {previewDocsFilterOptions.outcome_filter_partially_parsed.label}
            </EuiFilterButton>
          </EuiToolTip>
          <EuiToolTip
            content={previewDocsFilterOptions.outcome_filter_skipped.tooltip}
            key={previewDocsFilterOptions.outcome_filter_skipped.id}
          >
            <EuiFilterButton
              {...getFilterButtonPropsFor(previewDocsFilterOptions.outcome_filter_skipped.id)}
              badgeColor="accent"
              numActiveFilters={simulationSkippedRate}
            >
              {previewDocsFilterOptions.outcome_filter_skipped.label}
            </EuiFilterButton>
          </EuiToolTip>
          <EuiToolTip
            content={previewDocsFilterOptions.outcome_filter_failed.tooltip}
            key={previewDocsFilterOptions.outcome_filter_failed.id}
          >
            <EuiFilterButton
              {...getFilterButtonPropsFor(previewDocsFilterOptions.outcome_filter_failed.id)}
              badgeColor="accent"
              numActiveFilters={simulationFailedRate}
            >
              {previewDocsFilterOptions.outcome_filter_failed.label}
            </EuiFilterButton>
          </EuiToolTip>
          <EuiToolTip
            content={previewDocsFilterOptions.outcome_filter_dropped.tooltip}
            key={previewDocsFilterOptions.outcome_filter_dropped.id}
          >
            <EuiFilterButton
              {...getFilterButtonPropsFor(previewDocsFilterOptions.outcome_filter_dropped.id)}
              badgeColor="accent"
              numActiveFilters={simulationDroppedRate}
            >
              {previewDocsFilterOptions.outcome_filter_dropped.label}
            </EuiFilterButton>
          </EuiToolTip>
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const OutcomePreviewTable = ({ previewDocuments }: { previewDocuments: FlattenRecord[] }) => {
  const [userSelectedViewMode, setViewMode] = useLocalStorage<PreviewTableMode>(
    'streams:processorOutcomePreview:viewMode',
    'summary'
  );

  const detectedFields = useSimulatorSelector((state) => state.context.simulation?.detected_fields);
  const streamName = useSimulatorSelector((state) => state.context.streamName);

  const { fieldTypes: dataViewFieldTypes, dataView: streamDataView } =
    useStreamDataViewFieldTypes(streamName);
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
  const originalSamples = useSimulatorSelector((snapshot) =>
    selectOriginalPreviewRecords(snapshot.context)
  );
  const hasSimulatedRecords = useSimulatorSelector((snapshot) =>
    selectHasSimulatedRecords(snapshot.context)
  );

  const currentProcessorSourceField = useStreamEnrichmentSelector((state) => {
    const isInteractiveMode = selectIsInteractiveMode(state);
    if (!isInteractiveMode || !state.context.interactiveModeRef) return undefined;

    const stepRefs = state.context.interactiveModeRef.getSnapshot().context.stepRefs;

    for (const stepRef of stepRefs) {
      const snapshot = stepRef.getSnapshot();
      const step = snapshot.context.step;

      if (isActionBlock(step) && isStepUnderEdit(snapshot)) {
        return getSourceField(step);
      }
    }

    return undefined;
  });

  const docViewsRegistry = useDocViewerSetup(true);

  const {
    setExplicitlyEnabledPreviewColumns,
    setExplicitlyDisabledPreviewColumns,
    setPreviewColumnsOrder,
    setPreviewColumnsSorting,
  } = useStreamEnrichmentEvents();

  const allColumns = useMemo(() => {
    return getAllFieldsInOrder(previewDocuments, detectedFields);
  }, [detectedFields, previewDocuments]);

  const draftProcessor = useStreamEnrichmentSelector((snapshot) => {
    const isInteractiveMode = selectIsInteractiveMode(snapshot);
    return isInteractiveMode && snapshot.context.interactiveModeRef
      ? selectDraftProcessor(snapshot.context.interactiveModeRef.getSnapshot().context)
      : {
          processor: undefined,
          resources: undefined,
        };
  });

  // Get grok patterns from the draft processor
  const grokPatterns =
    draftProcessor?.processor &&
    'action' in draftProcessor.processor &&
    draftProcessor.processor.action === 'grok'
      ? draftProcessor.processor.patterns
      : [];

  // Convert patterns to DraftGrokExpression instances for field analysis
  // Kind of annoying we have to do this here when the Provider will also do this, but
  // this will change when we allow grok expressions to overwrite the configured field in the UI.
  const grokExpressions = useGrokExpressions(grokPatterns);

  // NOTE: If a Grok expression attempts to overwrite the configured field (non-additive change)
  // we defer to the standard preview table showing all columns
  const grokMode =
    draftProcessor?.processor &&
    'action' in draftProcessor.processor &&
    draftProcessor.processor.action === 'grok' &&
    !isEmpty(draftProcessor.processor.from) &&
    !grokExpressions.some((grokExpression: DraftGrokExpression) => {
      const fieldName = (draftProcessor.processor as GrokProcessor).from;
      return Array.from(grokExpression.getFields().values()).some(
        (field: FieldDefinition) => field.name === fieldName
      );
    });

  const grokField = grokMode ? (draftProcessor.processor as GrokProcessor).from : undefined;
  const validGrokField = grokField && allColumns.includes(grokField) ? grokField : undefined;

  const validCurrentProcessorSourceField =
    currentProcessorSourceField && allColumns.includes(currentProcessorSourceField)
      ? currentProcessorSourceField
      : undefined;

  // Calculate if view mode should be forced to 'columns'
  const isViewModeForced = Boolean(validGrokField || validCurrentProcessorSourceField);

  // Determine the effective view mode (forced to 'columns' if needed, otherwise user's choice)
  const effectiveViewMode = isViewModeForced ? 'columns' : userSelectedViewMode ?? 'summary';

  const availableColumns = useMemo(() => {
    let cols = getTableColumns({
      currentProcessorSourceField: validCurrentProcessorSourceField,
      detectedFields,
      previewDocsFilter,
    });

    if (cols.length === 0) {
      // If no columns are detected, fall back to all fields from the preview documents
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
    previewDocsFilter,
    validCurrentProcessorSourceField,
  ]);

  /**
   * If we are in Grok mode and the field matches an existing field,
   * we exclude the detected fields and only use the Grok field since it is highlighting extracted values
   */
  const grokColumns = useMemo(
    () => (validGrokField ? [validGrokField] : undefined),
    [validGrokField]
  );

  const previewColumns = grokColumns ?? availableColumns;

  // Calculate columns specifically for summary mode
  const displayColumnsForSummaryMode = useMemo(() => {
    // Start with detected fields
    const uniqueDetectedFields = detectedFields ? detectedFields.map((field) => field.name) : [];
    const baseFields = Array.from(new Set(uniqueDetectedFields));

    // Remove explicitly disabled columns
    const filteredFields = baseFields.filter(
      (field) => !explicitlyDisabledPreviewColumns.includes(field)
    );

    // Add explicitly enabled columns (if they exist in allColumns)
    const fieldsToShow = [...filteredFields];
    explicitlyEnabledPreviewColumns.forEach((col) => {
      if (!fieldsToShow.includes(col) && allColumns.includes(col)) {
        fieldsToShow.push(col);
      }
    });

    return fieldsToShow;
  }, [
    detectedFields,
    explicitlyDisabledPreviewColumns,
    explicitlyEnabledPreviewColumns,
    allColumns,
  ]);

  // Use appropriate columns based on view mode
  const displayColumnsForTable =
    effectiveViewMode === 'summary' ? displayColumnsForSummaryMode : previewColumns;

  const setVisibleColumns = useCallback(
    (visibleColumns: string[]) => {
      if (visibleColumns.length === 0) {
        // If no columns are visible, reset to default state
        setExplicitlyDisabledPreviewColumns([]);
        setExplicitlyEnabledPreviewColumns([]);
        setPreviewColumnsOrder([]);
        return;
      }

      // find which columns got added or removed comparing visibleColumns with the current displayColumns
      const addedColumns = visibleColumns.filter((col) => !displayColumnsForTable.includes(col));
      if (addedColumns.length > 0) {
        setExplicitlyEnabledPreviewColumns([
          ...explicitlyEnabledPreviewColumns,
          ...addedColumns.filter((col) => !explicitlyEnabledPreviewColumns.includes(col)),
        ]);
      }
      const removedColumns = displayColumnsForTable.filter((col) => !visibleColumns.includes(col));
      if (removedColumns.length > 0) {
        setExplicitlyDisabledPreviewColumns([
          ...explicitlyDisabledPreviewColumns,
          ...removedColumns.filter((col) => !explicitlyDisabledPreviewColumns.includes(col)),
        ]);
      }
      setPreviewColumnsOrder(visibleColumns);
    },
    [
      explicitlyDisabledPreviewColumns,
      explicitlyEnabledPreviewColumns,
      displayColumnsForTable,
      setExplicitlyDisabledPreviewColumns,
      setExplicitlyEnabledPreviewColumns,
      setPreviewColumnsOrder,
    ]
  );

  const renderCellValue = useMemo(
    () =>
      grokMode
        ? (document: SampleDocument, columnId: string) => {
            const value = document[columnId];
            if (typeof value === 'string' && columnId === validGrokField) {
              return <GrokSampleWithContext sample={value} />;
            } else {
              return <>&nbsp;</>;
            }
          }
        : undefined,
    [grokMode, validGrokField]
  );

  const hits = useMemo(() => {
    return toDataTableRecordWithIndex(previewDocuments);
  }, [previewDocuments]);

  const { currentDoc, selectedRowIndex, onRowSelected, setExpandedDoc } =
    useDocumentExpansion(hits);

  const docViewerContext = useMemo(
    () => ({
      originalSample: getOriginalSampleDocument(originalSamples, currentDoc?.index),
    }),
    [currentDoc, originalSamples]
  );

  useEffect(() => {
    if (docViewerContext.originalSample && hasSimulatedRecords) {
      // If the original sample is available, enable the diff tab - otherwise disable it
      docViewsRegistry.enableById(DOC_VIEW_DIFF_ID);
    } else {
      docViewsRegistry.disableById(DOC_VIEW_DIFF_ID);
    }
  }, [docViewerContext, docViewsRegistry, hasSimulatedRecords]);

  const rowSelectionContextValue = useMemo(
    () => ({ selectedRowIndex, onRowSelected }),
    [selectedRowIndex, onRowSelected]
  );

  const viewToggleMode = useMemo(
    () => ({
      currentMode: userSelectedViewMode ?? 'summary',
      setViewMode,
      isDisabled: isViewModeForced,
    }),
    [userSelectedViewMode, isViewModeForced, setViewMode]
  );

  const content = (
    <>
      <RowSelectionContext.Provider value={rowSelectionContextValue}>
        <MemoPreviewTable
          documents={previewDocuments}
          displayColumns={displayColumnsForTable}
          rowHeightsOptions={validGrokField ? staticRowHeightsOptions : undefined}
          toolbarVisibility
          setVisibleColumns={setVisibleColumns}
          sorting={previewColumnsSorting}
          setSorting={setPreviewColumnsSorting}
          columnOrderHint={previewColumnsOrder}
          renderCellValue={renderCellValue}
          mode={effectiveViewMode}
          streamName={streamName}
          viewModeToggle={viewToggleMode}
          dataViewFieldTypes={dataViewFieldTypes}
        />
      </RowSelectionContext.Provider>
      <DocViewerContext.Provider value={docViewerContext}>
        <PreviewFlyout
          currentDoc={currentDoc}
          hits={hits}
          setExpandedDoc={setExpandedDoc}
          docViewsRegistry={docViewsRegistry}
          streamName={streamName}
          streamDataView={streamDataView}
        />
      </DocViewerContext.Provider>
    </>
  );

  // Wrap with GrokExpressionsProvider when in grok mode to provide patterns to Sample components
  return grokMode ? (
    <GrokExpressionsProvider patterns={grokPatterns}>{content}</GrokExpressionsProvider>
  ) : (
    content
  );
};

const staticRowHeightsOptions: EuiDataGridRowHeightsOptions = { defaultHeight: 'auto' };

const selectedButtonLabel = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.processor.conditionFilterSelectedBadge',
  {
    defaultMessage: 'Selected',
  }
);
