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
import { isActionBlock } from '@kbn/streamlang';
import type { FlattenRecord, SampleDocument } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useGrokExpressions, GrokExpressionsProvider, GrokSampleWithContext } from '@kbn/grok-ui';
import { useDocViewerSetup } from '../../../../hooks/use_doc_viewer_setup';
import { useDocumentExpansion } from '../../../../hooks/use_document_expansion';
import { useStreamDataViewFieldTypes } from '../../../../hooks/use_stream_data_view_field_types';
import { getPercentageFormatter } from '../../../../util/formatters';
import { MemoPreviewTable, PreviewFlyout, type PreviewTableMode } from '../shared';
import { RowSelectionContext } from '../shared/preview_table';
import { toDataTableRecordWithIndex } from '../stream_detail_routing/utils';
import { DOC_VIEW_DIFF_ID, DocViewerContext } from './doc_viewer_diff';
import {
  createOriginalGrokFieldValuesMap,
  getGrokFieldDisplayValue,
  grokExpressionOverwritesSourceField,
  hasPrecedingProcessorTouchedField,
} from './processor_outcome_preview_helpers';
import {
  NoPreviewDocumentsEmptyPrompt,
  NoProcessingDataAvailableEmptyPrompt,
} from './empty_prompts';
import { useDataSourceSelector } from './state_management/data_source_state_machine';
import { selectDraftProcessorDefinition } from './state_management/interactive_mode_machine/selectors';
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
  const derivedDocumentMetrics = useSimulatorSelector((state) => {
    const docs = state.context.simulation?.documents;
    if (!docs) return undefined;

    const selectedConditionId = state.context.selectedConditionId;
    const filteredDocs = selectedConditionId
      ? docs.filter((doc) => doc.processed_by?.includes(selectedConditionId) ?? false)
      : docs;

    const total = filteredDocs.length;
    if (total === 0) return undefined;

    const counts = filteredDocs.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      failed_rate: (counts.failed ?? 0) / total,
      partially_parsed_rate: (counts.partially_parsed ?? 0) / total,
      skipped_rate: (counts.skipped ?? 0) / total,
      parsed_rate: (counts.parsed ?? 0) / total,
      dropped_rate: (counts.dropped ?? 0) / total,
    };
  });

  const hasMetrics = Boolean(derivedDocumentMetrics);
  const simulationFailedRate = formatRateToPercentage(derivedDocumentMetrics?.failed_rate);
  const simulationSkippedRate = formatRateToPercentage(derivedDocumentMetrics?.skipped_rate);
  const simulationPartiallyParsedRate = formatRateToPercentage(
    derivedDocumentMetrics?.partially_parsed_rate
  );
  const simulationParsedRate = formatRateToPercentage(derivedDocumentMetrics?.parsed_rate);
  const simulationDroppedRate = formatRateToPercentage(derivedDocumentMetrics?.dropped_rate);
  const selectedConditionId = useSimulatorSelector((state) => state.context.selectedConditionId);
  const conditionPercentage = useSimulatorSelector((state) => {
    const conditionId = state.context.selectedConditionId;
    if (!conditionId) return 0;
    const metrics = state.context.simulation?.processors_metrics?.[conditionId];
    if (!metrics) return 0;
    // Condition match rate is tracked via the simulation-only condition noop processor:
    // it is skipped when the condition doesn't match.
    const matchedRate = 1 - (metrics.skipped_rate ?? 0);
    return Math.round(matchedRate * 100);
  });

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

  const currentStepId = useStreamEnrichmentSelector((state) => {
    const isInteractiveMode = selectIsInteractiveMode(state);
    if (!isInteractiveMode || !state.context.interactiveModeRef) return undefined;
    const stepRefs = state.context.interactiveModeRef.getSnapshot().context.stepRefs;
    for (const stepRef of stepRefs) {
      const snapshot = stepRef.getSnapshot();
      if (isActionBlock(snapshot.context.step) && isStepUnderEdit(snapshot)) {
        return stepRef.id;
      }
    }
    return undefined;
  });

  // Stabilize stepIds: join into a string for selector comparison, then split back.
  // This avoids returning a new array reference on every XState state change.
  const stepIdsString = useStreamEnrichmentSelector((state) => {
    const isInteractiveMode = selectIsInteractiveMode(state);
    if (!isInteractiveMode || !state.context.interactiveModeRef) return '';
    const stepRefs = state.context.interactiveModeRef.getSnapshot().context.stepRefs;
    return stepRefs.map((ref) => ref.id).join('\0');
  });
  const stepIds = useMemo(
    () => (stepIdsString ? stepIdsString.split('\0') : []),
    [stepIdsString]
  );

  const processorsMetrics = useSimulatorSelector(
    (snapshot) => snapshot.context.simulation?.processors_metrics
  );

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

  // Extract only primitive/stable values from the draft processor to avoid re-renders.
  // We select the grok source field (a string or undefined) and the patterns (joined as a string)
  // so that the selector returns stable values when the user is typing but hasn't changed
  // which field is being processed or the set of patterns.
  const grokSourceField = useStreamEnrichmentSelector((snapshot) => {
    const isInteractiveMode = selectIsInteractiveMode(snapshot);
    if (!isInteractiveMode || !snapshot.context.interactiveModeRef) return undefined;
    const proc = selectDraftProcessorDefinition(
      snapshot.context.interactiveModeRef.getSnapshot().context
    );
    if (proc && 'action' in proc && proc.action === 'grok' && !isEmpty(proc.from)) {
      return proc.from;
    }
    return undefined;
  });

  // Select grok patterns as a joined string for stable comparison.
  // Only re-renders when the actual pattern text changes, not on unrelated state changes.
  const grokPatternsString = useStreamEnrichmentSelector((snapshot) => {
    const isInteractiveMode = selectIsInteractiveMode(snapshot);
    if (!isInteractiveMode || !snapshot.context.interactiveModeRef) return '';
    const proc = selectDraftProcessorDefinition(
      snapshot.context.interactiveModeRef.getSnapshot().context
    );
    if (proc && 'action' in proc && proc.action === 'grok') {
      return proc.patterns.join('\0');
    }
    return '';
  });

  const grokPatterns = useMemo(
    () => (grokPatternsString ? grokPatternsString.split('\0') : []),
    [grokPatternsString]
  );

  const isGrokProcessorActive = grokSourceField !== undefined;

  // Debounce grok patterns before passing to useGrokExpressions.
  // The @kbn/grok-ui updateExpression() calls resolvePattern(true) synchronously,
  // triggering expensive Oniguruma regex resolution on every keystroke.
  // Debouncing prevents this per-keystroke cost for highlighting.
  const [debouncedGrokPatterns, setDebouncedGrokPatterns] = useState(grokPatterns);
  const grokPatternsDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    // Clear debounced patterns immediately when leaving grok mode to prevent
    // stale patterns from briefly rendering after switching processor type.
    if (!isGrokProcessorActive) {
      clearTimeout(grokPatternsDebounceRef.current);
      setDebouncedGrokPatterns([]);
      return;
    }
    clearTimeout(grokPatternsDebounceRef.current);
    grokPatternsDebounceRef.current = setTimeout(() => {
      setDebouncedGrokPatterns(grokPatterns);
    }, 1000);
    return () => clearTimeout(grokPatternsDebounceRef.current);
  }, [grokPatterns, isGrokProcessorActive]);

  // Convert debounced patterns to DraftGrokExpression instances for highlighting
  const grokExpressions = useGrokExpressions(debouncedGrokPatterns);
  const validGrokSourceField =
    grokSourceField && allColumns.includes(grokSourceField) ? grokSourceField : undefined;

  // Check if the grok expression overwrites the source field (non-additive pattern)
  const grokOverwritesSourceField = useMemo(() => {
    if (!validGrokSourceField || grokExpressions.length === 0) return false;
    return grokExpressionOverwritesSourceField(grokExpressions, validGrokSourceField);
  }, [grokExpressions, validGrokSourceField]);

  // Check if any preceding processor has touched the grok source field
  const precedingProcessorTouchedGrokField = useMemo(() => {
    if (!validGrokSourceField) return false;
    return hasPrecedingProcessorTouchedField(
      stepIds,
      currentStepId,
      processorsMetrics,
      validGrokSourceField
    );
  }, [stepIds, currentStepId, processorsMetrics, validGrokSourceField]);

  /**
   * Grok mode enables the special highlighting preview for grok patterns.
   *
   * We enable grok mode when:
   * - We have a grok processor with a valid source field
   * - AND one of:
   *   - The grok pattern is additive (doesn't overwrite the source field), OR
   *   - The grok pattern overwrites the source field BUT no preceding processor has touched it
   *     (in this case, we can safely use the original pre-transformation value for highlighting)
   *
   * We DISABLE grok mode when:
   * - The grok pattern overwrites the source field AND a preceding processor touched the field
   *   (in this case, we can't show correct highlighting - the original value doesn't reflect
   *   preceding transformations, and the current value has been overwritten by grok)
   */
  const grokMode =
    isGrokProcessorActive &&
    validGrokSourceField !== undefined &&
    !(grokOverwritesSourceField && precedingProcessorTouchedGrokField);

  const validGrokField = grokMode ? validGrokSourceField : undefined;

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

  /**
   * Map from preview document to the original (pre-transformation) value of the grok field.
   * This is needed when the grok pattern extracts into the same field it reads from (e.g., message → message).
   * We use a WeakMap keyed by the document object reference for O(1) lookup in renderCellValue.
   *
   * We only create this map when grok mode is active AND the grok expression overwrites the source field.
   * When the grok expression is additive (doesn't overwrite the source field), the current document value
   * is correct for highlighting and we don't need the original values.
   */
  const originalGrokFieldValues = useMemo(() => {
    if (!grokMode || !validGrokField || !originalSamples) return undefined;
    if (!grokOverwritesSourceField) return undefined;

    return createOriginalGrokFieldValuesMap(previewDocuments, originalSamples, validGrokField);
  }, [grokMode, validGrokField, originalSamples, previewDocuments, grokOverwritesSourceField]);

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
      grokMode && validGrokField
        ? (document: SampleDocument, columnId: string) => {
            // Use the original (pre-transformation) value for the grok field.
            // This ensures highlighting works even when grok extracts into the same field it reads from.
            const value = getGrokFieldDisplayValue(
              document,
              columnId,
              validGrokField,
              originalGrokFieldValues
            );

            if (typeof value === 'string') {
              return <GrokSampleWithContext sample={value} />;
            }
            return <>&nbsp;</>;
          }
        : undefined,
    [grokMode, originalGrokFieldValues, validGrokField]
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

  // Wrap with GrokExpressionsProvider when in grok mode to provide patterns to Sample components.
  // Use debouncedGrokPatterns to prevent the provider from re-rendering the entire tree
  // (including all table cells and GrokSampleWithContext components) on every keystroke.
  return grokMode ? (
    <GrokExpressionsProvider patterns={debouncedGrokPatterns}>{content}</GrokExpressionsProvider>
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
