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
import { selectDraftProcessor } from './state_management/interactive_mode_machine/selectors';
import type { PreviewDocsFilterOption } from './state_management/simulation_state_machine';
import {
  getAdditionalSourceFields,
  getAllFieldsInOrder,
  getOriginalSampleDocument,
  getSourceField,
  getTargetField,
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

  const {
    currentProcessorSourceField,
    currentProcessorTargetField,
    currentProcessorAdditionalSourceFields,
    currentStepId,
    stepIds,
  } = useStreamEnrichmentSelector((state) => {
    const isInteractiveMode = selectIsInteractiveMode(state);
    if (!isInteractiveMode || !state.context.interactiveModeRef) {
      return {
        currentProcessorSourceField: undefined,
        currentProcessorTargetField: undefined,
        currentProcessorAdditionalSourceFields: [] as string[],
        currentStepId: undefined,
        stepIds: [],
      };
    }

    const stepRefs = state.context.interactiveModeRef.getSnapshot().context.stepRefs;
    const allStepIds = stepRefs.map((ref) => ref.id);

    for (const stepRef of stepRefs) {
      const snapshot = stepRef.getSnapshot();
      const step = snapshot.context.step;

      if (isActionBlock(step) && isStepUnderEdit(snapshot)) {
        return {
          currentProcessorSourceField: getSourceField(step),
          currentProcessorTargetField: getTargetField(step),
          currentProcessorAdditionalSourceFields: getAdditionalSourceFields(step),
          currentStepId: stepRef.id,
          stepIds: allStepIds,
        };
      }
    }

    return {
      currentProcessorSourceField: undefined,
      currentProcessorTargetField: undefined,
      currentProcessorAdditionalSourceFields: [] as string[],
      currentStepId: undefined,
      stepIds: allStepIds,
    };
  });

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
  const grokExpressions = useGrokExpressions(grokPatterns);

  // Determine if the grok processor is active (has a from field)
  const isGrokProcessorActive =
    draftProcessor?.processor &&
    'action' in draftProcessor.processor &&
    draftProcessor.processor.action === 'grok' &&
    !isEmpty(draftProcessor.processor.from);

  // Get the source field for the grok processor
  const grokSourceField = isGrokProcessorActive
    ? (draftProcessor.processor as GrokProcessor).from
    : undefined;
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
   *
   * Grok highlighting is debounced (1s) because each visible cell triggers expensive
   * Oniguruma-to-JS regex compilation in GrokSampleWithContext. Without debouncing,
   * 50 visible rows × 3 getRegex() calls = 150 regex compilations per keystroke.
   */
  const immediateGrokMode =
    isGrokProcessorActive &&
    validGrokSourceField !== undefined &&
    !(grokOverwritesSourceField && precedingProcessorTouchedGrokField);

  const [grokMode, setGrokMode] = useState(immediateGrokMode);
  const grokModeDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    // Disable grok mode immediately when conditions are no longer met
    if (!immediateGrokMode) {
      clearTimeout(grokModeDebounceRef.current);
      setGrokMode(false);
      return;
    }
    // Enable grok mode after 1s debounce (avoids expensive per-cell regex work while typing)
    clearTimeout(grokModeDebounceRef.current);
    grokModeDebounceRef.current = setTimeout(() => {
      setGrokMode(true);
    }, 1000);
    return () => clearTimeout(grokModeDebounceRef.current);
  }, [immediateGrokMode]);

  const validGrokField = grokMode ? validGrokSourceField : undefined;

  // Always show the source field when a processor is being edited, even if it's
  // not yet in allColumns (e.g., when simulation fails during pattern typing).
  // getSourceField() already trims and validates the field name.
  const validCurrentProcessorSourceField = currentProcessorSourceField;

  // Calculate if view mode should be forced to 'columns'
  // Use grokColumns (not validGrokField) so columns mode is forced even while
  // grok highlighting is debounced — the user sees columns immediately.
  const isViewModeForced = Boolean(
    grokColumns ||
      validCurrentProcessorSourceField ||
      currentProcessorTargetField ||
      currentProcessorAdditionalSourceFields.length > 0
  );

  // Determine the effective view mode (forced to 'columns' if needed, otherwise user's choice)
  const effectiveViewMode = isViewModeForced ? 'columns' : userSelectedViewMode ?? 'summary';

  const availableColumns = useMemo(() => {
    let cols = getTableColumns({
      currentProcessorSourceField: validCurrentProcessorSourceField,
      currentProcessorTargetField,
      additionalSourceFields: currentProcessorAdditionalSourceFields,
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
    currentProcessorAdditionalSourceFields,
    currentProcessorTargetField,
    detectedFields,
    explicitlyDisabledPreviewColumns,
    explicitlyEnabledPreviewColumns,
    previewDocsFilter,
    validCurrentProcessorSourceField,
  ]);

  /**
   * In Grok mode, show the source field plus all fields extracted by the grok patterns.
   * As the user types patterns (e.g. %{DATA:attributes.ad.category}), the extracted field
   * names are parsed from the expressions and auto-activated as preview columns.
   *
   * Note: column extraction (getFields) is cheap. The expensive part is grok highlighting
   * (GrokSampleWithContext), which is debounced via grokMode above. Columns always use
   * the grok source field even when highlighting is debounced, so the source field stays
   * visible while typing.
   */
  const grokColumns = useMemo(() => {
    if (!isGrokProcessorActive || !validGrokSourceField) return undefined;
    const extractedFields: string[] = [];
    grokExpressions.forEach((expr) => {
      const fieldsMap = expr.getFields();
      fieldsMap.forEach((fieldDef) => {
        if (fieldDef.name && !extractedFields.includes(fieldDef.name)) {
          extractedFields.push(fieldDef.name);
        }
      });
    });
    return [validGrokSourceField, ...extractedFields];
  }, [isGrokProcessorActive, validGrokSourceField, grokExpressions]);

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
            // Only apply grok highlighting to the source field.
            // For extracted fields (e.g. attributes.ad.category), return undefined
            // to fall through to the default cell renderer which shows the simulated value.
            if (columnId !== validGrokField) {
              return undefined;
            }

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
