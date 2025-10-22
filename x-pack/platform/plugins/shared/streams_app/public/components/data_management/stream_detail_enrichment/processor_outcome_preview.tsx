/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { EuiDataGridRowHeightsOptions } from '@elastic/eui';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { Sample } from '@kbn/grok-ui';
import type { FlattenRecord, SampleDocument } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import type { GrokProcessor } from '@kbn/streamlang';
import { isActionBlock } from '@kbn/streamlang';
import { useDocViewerSetup } from '../../../hooks/use_doc_viewer_setup';
import { useDocumentExpansion } from '../../../hooks/use_document_expansion';
import { getPercentageFormatter } from '../../../util/formatters';
import type { PreviewDocsFilterOption } from './state_management/simulation_state_machine';
import {
  getAllFieldsInOrder,
  getSourceField,
  getTableColumns,
  previewDocsFilterOptions,
} from './state_management/simulation_state_machine';
import {
  selectHasSimulatedRecords,
  selectOriginalPreviewRecords,
  selectPreviewRecords,
} from './state_management/simulation_state_machine/selectors';
import {
  useSimulatorSelector,
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import { isStepUnderEdit } from './state_management/steps_state_machine';
import { selectDraftProcessor } from './state_management/stream_enrichment_state_machine/selectors';
import { DOC_VIEW_DIFF_ID, DocViewerContext } from './doc_viewer_diff';
import {
  NoPreviewDocumentsEmptyPrompt,
  NoProcessingDataAvailableEmptyPrompt,
} from './empty_prompts';
import { PreviewFlyout, MemoPreviewTable } from '../shared';
import { toDataTableRecordWithIndex } from '../stream_detail_routing/utils';
import { RowSelectionContext } from '../shared/preview_table';

export const ProcessorOutcomePreview = () => {
  const samples = useSimulatorSelector((snapshot) => snapshot.context.samples);
  const previewDocuments = useSimulatorSelector((snapshot) =>
    selectPreviewRecords(snapshot.context)
  );

  const areDataSourcesLoading = useStreamEnrichmentSelector((state) =>
    state.context.dataSourcesRefs.some((ref) => {
      const snap = ref.getSnapshot();
      return (
        snap.matches({ enabled: 'loadingData' }) || snap.matches({ enabled: 'debouncingChanges' })
      );
    })
  );

  if (isEmpty(samples)) {
    if (areDataSourcesLoading) {
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
  const { changePreviewDocsFilter } = useStreamEnrichmentEvents();

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

  const getFilterButtonPropsFor = (filter: PreviewDocsFilterOption) => ({
    isToggle: previewDocsFilter === filter,
    isSelected: previewDocsFilter === filter,
    disabled: !hasMetrics,
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
          numActiveFilters={simulationParsedRate}
        >
          {previewDocsFilterOptions.outcome_filter_parsed.label}
        </EuiFilterButton>
        <EuiFilterButton
          {...getFilterButtonPropsFor(previewDocsFilterOptions.outcome_filter_partially_parsed.id)}
          badgeColor="accent"
          numActiveFilters={simulationPartiallyParsedRate}
        >
          {previewDocsFilterOptions.outcome_filter_partially_parsed.label}
        </EuiFilterButton>
        <EuiFilterButton
          {...getFilterButtonPropsFor(previewDocsFilterOptions.outcome_filter_skipped.id)}
          badgeColor="accent"
          numActiveFilters={simulationSkippedRate}
        >
          {previewDocsFilterOptions.outcome_filter_skipped.label}
        </EuiFilterButton>
        <EuiFilterButton
          {...getFilterButtonPropsFor(previewDocsFilterOptions.outcome_filter_failed.id)}
          badgeColor="accent"
          numActiveFilters={simulationFailedRate}
        >
          {previewDocsFilterOptions.outcome_filter_failed.label}
        </EuiFilterButton>
      </EuiFilterGroup>
    </EuiFlexGroup>
  );
};

const OutcomePreviewTable = ({ previewDocuments }: { previewDocuments: FlattenRecord[] }) => {
  const detectedFields = useSimulatorSelector((state) => state.context.simulation?.detected_fields);
  const streamName = useSimulatorSelector((state) => state.context.streamName);
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

  const shouldShowRowSourceAvatars = useStreamEnrichmentSelector(
    (state) => state.context.dataSourcesRefs.length >= 2
  );
  const currentProcessorSourceField = useStreamEnrichmentSelector((state) => {
    const currentProcessorRef = state.context.stepRefs.find(
      (stepRef) =>
        isActionBlock(stepRef.getSnapshot().context.step) && isStepUnderEdit(stepRef.getSnapshot())
    );

    if (!currentProcessorRef) return undefined;

    const step = currentProcessorRef.getSnapshot().context.step;

    if (!isActionBlock(step)) return undefined;

    return getSourceField(step);
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

  const draftProcessor = useStreamEnrichmentSelector((snapshot) =>
    selectDraftProcessor(snapshot.context)
  );

  const grokCollection = useStreamEnrichmentSelector(
    (machineState) => machineState.context.grokCollection
  );

  const grokMode =
    draftProcessor?.processor &&
    'action' in draftProcessor.processor &&
    draftProcessor.processor.action === 'grok' &&
    !isEmpty(draftProcessor.processor.from) &&
    // NOTE: If a Grok expression attempts to overwrite the configured field (non-additive change) we defer to the standard preview table showing all columns
    !draftProcessor.resources?.grokExpressions.some((grokExpression) => {
      if (draftProcessor.processor && !(draftProcessor.processor.action === 'grok')) return false;
      const fieldName = draftProcessor.processor?.from;
      return Array.from(grokExpression.getFields().values()).some(
        (field) => field.name === fieldName
      );
    });

  const grokField = grokMode ? (draftProcessor.processor as GrokProcessor).from : undefined;
  const validGrokField = grokField && allColumns.includes(grokField) ? grokField : undefined;

  const validCurrentProcessorSourceField =
    currentProcessorSourceField && allColumns.includes(currentProcessorSourceField)
      ? currentProcessorSourceField
      : undefined;

  const availableColumns = useMemo(() => {
    let cols = getTableColumns({
      currentProcessorSourceField: validCurrentProcessorSourceField,
      detectedFields,
      previewDocsFilter,
    });

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

  const setVisibleColumns = useCallback(
    (visibleColumns: string[]) => {
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
    },
    [
      allColumns,
      explicitlyDisabledPreviewColumns,
      explicitlyEnabledPreviewColumns,
      previewColumns,
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
              return (
                <Sample
                  grokCollection={grokCollection}
                  draftGrokExpressions={draftProcessor.resources?.grokExpressions ?? []}
                  sample={value}
                />
              );
            } else {
              return <>&nbsp;</>;
            }
          }
        : undefined,
    [draftProcessor.resources?.grokExpressions, grokCollection, grokMode, validGrokField]
  );

  const hits = useMemo(() => {
    return toDataTableRecordWithIndex(previewDocuments);
  }, [previewDocuments]);

  const { currentDoc, selectedRowIndex, onRowSelected, setExpandedDoc } =
    useDocumentExpansion(hits);

  const docViewerContext = useMemo(
    () => ({
      originalSample:
        originalSamples && currentDoc ? originalSamples[currentDoc.index].document : undefined,
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

  return (
    <>
      <RowSelectionContext.Provider value={rowSelectionContextValue}>
        <MemoPreviewTable
          documents={previewDocuments}
          originalSamples={originalSamples}
          showRowSourceAvatars={shouldShowRowSourceAvatars}
          displayColumns={previewColumns}
          rowHeightsOptions={validGrokField ? staticRowHeightsOptions : undefined}
          toolbarVisibility
          setVisibleColumns={setVisibleColumns}
          sorting={previewColumnsSorting}
          setSorting={setPreviewColumnsSorting}
          columnOrderHint={previewColumnsOrder}
          renderCellValue={renderCellValue}
        />
      </RowSelectionContext.Provider>
      <DocViewerContext.Provider value={docViewerContext}>
        <PreviewFlyout
          currentDoc={currentDoc}
          hits={hits}
          setExpandedDoc={setExpandedDoc}
          docViewsRegistry={docViewsRegistry}
          streamName={streamName}
        />
      </DocViewerContext.Provider>
    </>
  );
};

const staticRowHeightsOptions: EuiDataGridRowHeightsOptions = { defaultHeight: 'auto' };
