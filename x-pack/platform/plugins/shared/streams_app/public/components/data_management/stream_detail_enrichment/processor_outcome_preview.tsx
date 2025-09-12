/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import type { GrokProcessor } from '@kbn/streamlang';
import { getPercentageFormatter } from '../../../util/formatters';
import { useKibana } from '../../../hooks/use_kibana';
import type { PreviewDocsFilterOption } from './state_management/simulation_state_machine';
import {
  getSourceField,
  getTableColumns,
  getUniqueDetectedFields,
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
import { isProcessorUnderEdit } from './state_management/processor_state_machine';
import { selectDraftProcessor } from './state_management/stream_enrichment_state_machine/selectors';
import { docViewJson } from './doc_viewer_json';
import { DOC_VIEW_DIFF_ID, DocViewerContext, docViewDiff } from './doc_viewer_diff';
import type { DataTableRecordWithIndex } from './preview_flyout';
import { PreviewFlyout } from './preview_flyout';
import { MemoProcessingPreviewTable } from './processing_preview_table';
import {
  NoPreviewDocumentsEmptyPrompt,
  NoProcessingDataAvailableEmptyPrompt,
} from './empty_prompts';

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
    const currentProcessorRef = state.context.processorsRefs.find((processorRef) =>
      isProcessorUnderEdit(processorRef.getSnapshot())
    );

    if (!currentProcessorRef) return undefined;

    return getSourceField(currentProcessorRef.getSnapshot().context.processor);
  });

  const { dependencies } = useKibana();
  const { unifiedDocViewer } = dependencies.start;

  const docViewsRegistry = useMemo(() => {
    const docViewers = unifiedDocViewer.registry.getAll();
    const myRegistry = new DocViewsRegistry([
      docViewers.find((docView) => docView.id === 'doc_view_table')!,
      docViewDiff,
      docViewJson,
    ]);
    return myRegistry;
  }, [unifiedDocViewer.registry]);

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
    // Keep the detected fields as first columns on the table and sort the rest alphabetically
    const uniqDetectedFields = getUniqueDetectedFields(detectedFields);
    const otherFields = Array.from(fields).filter((field) => !uniqDetectedFields.includes(field));

    return [...uniqDetectedFields, ...otherFields.sort()];
  }, [detectedFields, previewDocuments]);

  const draftProcessor = useStreamEnrichmentSelector((snapshot) =>
    selectDraftProcessor(snapshot.context)
  );

  const grokCollection = useStreamEnrichmentSelector(
    (machineState) => machineState.context.grokCollection
  );

  const grokMode =
    draftProcessor?.processor &&
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
    return previewDocuments.map((doc, index) =>
      // make sure the ID is unique when remapping a new batch of preview documents so the document flyout will refresh properly
      ({
        raw: doc,
        flattened: doc,
        index,
        id: `${index}-${Date.now()}`,
      })
    );
  }, [previewDocuments]);

  const [currentDoc, setExpandedDoc] = React.useState<DataTableRecordWithIndex | undefined>(
    undefined
  );

  useEffect(() => {
    if (currentDoc) {
      // if a current doc is set but not in the hits, update it to point to the newly mapped hit with the same index
      const hit = hits.find((h) => h.index === currentDoc.index);
      if (hit && hit !== currentDoc) {
        setExpandedDoc(hit);
      } else if (!hit && currentDoc) {
        // if the current doc is not found in the hits, reset it
        setExpandedDoc(undefined);
      }
    }
  }, [currentDoc, hits]);

  const currentDocRef = useRef<DataTableRecordWithIndex | undefined>(currentDoc);
  currentDocRef.current = currentDoc;
  const hitsRef = useRef<DataTableRecordWithIndex[]>(hits);
  hitsRef.current = hits;
  const onRowSelected = useCallback((rowIndex: number) => {
    if (currentDocRef.current && hitsRef.current[rowIndex] === currentDocRef.current) {
      // If the same row is clicked, we collapse the flyout
      setExpandedDoc(undefined);
      return;
    }
    setExpandedDoc(hitsRef.current[rowIndex]);
  }, []);

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

  return (
    <>
      <MemoProcessingPreviewTable
        documents={previewDocuments}
        originalSamples={originalSamples}
        showRowSourceAvatars={shouldShowRowSourceAvatars}
        onRowSelected={onRowSelected}
        selectedRowIndex={hits.findIndex((hit) => hit === currentDoc)}
        displayColumns={previewColumns}
        rowHeightsOptions={validGrokField ? staticRowHeightsOptions : undefined}
        toolbarVisibility
        setVisibleColumns={setVisibleColumns}
        sorting={previewColumnsSorting}
        setSorting={setPreviewColumnsSorting}
        columnOrderHint={previewColumnsOrder}
        renderCellValue={renderCellValue}
      />
      <DocViewerContext.Provider value={docViewerContext}>
        <PreviewFlyout
          currentDoc={currentDoc}
          hits={hits}
          setExpandedDoc={setExpandedDoc}
          docViewsRegistry={docViewsRegistry}
        />
      </DocViewerContext.Provider>
    </>
  );
};

const staticRowHeightsOptions: EuiDataGridRowHeightsOptions = { defaultHeight: 'auto' };
