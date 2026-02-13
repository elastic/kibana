/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingElastic,
  EuiProgress,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isCondition } from '@kbn/streamlang';
import { getSegments, MAX_NESTING_LEVEL, type SampleDocument } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import React, { useMemo, useState, useCallback } from 'react';
import { useDocViewerSetup } from '../../../hooks/use_doc_viewer_setup';
import { useDocumentExpansion } from '../../../hooks/use_document_expansion';
import { useStreamDataViewFieldTypes } from '../../../hooks/use_stream_data_view_field_types';
import { AssetImage } from '../../asset_image';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';
import { MemoPreviewTable, PreviewFlyout, type PreviewTableMode } from '../shared';
import { buildCellActions } from './cell_actions';
import { DocumentMatchFilterControls } from './document_match_filter_controls';
import {
  selectPreviewDocuments,
  useStreamRoutingEvents,
  useStreamSamplesSelector,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';
import { processCondition, toDataTableRecordWithIndex } from './utils';
import { RowSelectionContext } from '../shared/preview_table';
import { useQueryStreamCreation } from './query_stream_creation_context';

export function PreviewPanel() {
  const samplesSnapshot = useStreamSamplesSelector((snapshot) => snapshot);
  const queryStreamCreation = useQueryStreamCreation();

  const definition = useStreamsRoutingSelector((snapshot) => snapshot.context.definition);
  const canCreateRoutingRules = useStreamsRoutingSelector((snapshot) =>
    snapshot.can({ type: 'routingRule.create' })
  );
  const isQueryModeCreating = useStreamsRoutingSelector((snapshot) =>
    snapshot.matches({ ready: { queryMode: 'creating' } })
  );
  const isQueryModeIdle = useStreamsRoutingSelector((snapshot) =>
    snapshot.matches({ ready: { queryMode: 'idle' } })
  );
  const isIngestModeIdle = useStreamsRoutingSelector((snapshot) =>
    snapshot.matches({ ready: { ingestMode: 'idle' } })
  );
  const isEditingOrReordering = useStreamsRoutingSelector(
    (snapshot) =>
      snapshot.matches({ ready: { ingestMode: 'editingRule' } }) ||
      snapshot.matches({ ready: { ingestMode: 'reorderingRules' } })
  );
  const isCreatingOrReviewingOrEditingSuggestion = useStreamsRoutingSelector(
    (snapshot) =>
      snapshot.matches({ ready: { ingestMode: 'creatingNewRule' } }) ||
      snapshot.matches({ ready: { ingestMode: 'reviewSuggestedRule' } }) ||
      snapshot.matches({ ready: { ingestMode: 'editingSuggestedRule' } })
  );

  const maxNestingLevel = getSegments(definition.stream.name).length >= MAX_NESTING_LEVEL;

  const documents = selectPreviewDocuments(samplesSnapshot.context);
  const hasDocuments = !isEmpty(documents);
  const isLoadingDocuments = samplesSnapshot.matches({ fetching: { documents: 'loading' } });

  let content;

  if (isQueryModeCreating) {
    content = (
      <QueryStreamPreviewPanel
        streamName={definition.stream.name}
        documents={queryStreamCreation.documents ?? []}
        documentsError={queryStreamCreation.error}
        isLoading={queryStreamCreation.isLoading}
      />
    );
  } else if (isQueryModeIdle) {
    content = <QueryModeIdlePanel />;
  } else if (isIngestModeIdle) {
    content = <SamplePreviewPanel enableActions={canCreateRoutingRules && !maxNestingLevel} />;
  } else if (isEditingOrReordering) {
    content = <EditingPanel />;
  } else if (isCreatingOrReviewingOrEditingSuggestion) {
    content = <SamplePreviewPanel enableActions />;
  }

  return (
    <>
      <EuiFlexItem grow={false} data-test-subj="streamsAppRoutingPreviewPanel">
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="spaceBetween" wrap>
              <EuiFlexGroup direction="column" gutterSize="xs">
                <EuiFlexGroup component="span" gutterSize="s">
                  <EuiIcon type="inspect" />
                  <strong data-test-subj="streamsAppRoutingPreviewPanelHeader">
                    {i18n.translate('xpack.streams.streamDetail.preview.header', {
                      defaultMessage: 'Data Preview',
                    })}
                  </strong>
                </EuiFlexGroup>
                {!hasDocuments && !isLoadingDocuments && (
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued">
                      {i18n.translate('xpack.streams.streamDetail.preview.viewingZeroDocuments', {
                        defaultMessage: 'Viewing 0 documents',
                      })}
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              <StreamsAppSearchBar showDatePicker />
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow>{content}</EuiFlexItem>
    </>
  );
}

const EditingPanel = () => (
  <EuiEmptyPrompt
    data-test-subj="streamsAppRoutingPreviewEditingPanel"
    icon={<AssetImage />}
    titleSize="xxs"
    title={
      <h2 data-test-subj="streamsAppRoutingPreviewEditingPanelTitle">
        {i18n.translate('xpack.streams.streamDetail.preview.editPreviewMessage', {
          defaultMessage: 'Preview is not available while editing or reordering streams',
        })}
      </h2>
    }
    body={
      <>
        <EuiText size="xs">
          <p data-test-subj="streamsAppRoutingPreviewEditingPanelBodyMessage">
            {i18n.translate('xpack.streams.streamDetail.preview.editPreviewMessageBody', {
              defaultMessage:
                'Once you save your changes, the results of your conditions will appear here.',
            })}
          </p>
          <p data-test-subj="streamsAppRoutingPreviewEditingPanelReorderingWarning">
            {i18n.translate('xpack.streams.streamDetail.preview.editPreviewReorderingWarning', {
              defaultMessage:
                'Additionally, you will not be able to edit existing streams while reordering them, you should save or cancel your changes first.',
            })}
          </p>
        </EuiText>
      </>
    }
  />
);

const SamplePreviewPanel = ({ enableActions }: { enableActions: boolean }) => {
  const samplesSnapshot = useStreamSamplesSelector((snapshot) => snapshot);
  const { setDocumentMatchFilter, changeRule, createNewRule } = useStreamRoutingEvents();
  const isLoadingDocuments = samplesSnapshot.matches({ fetching: { documents: 'loading' } });
  const isUpdating =
    samplesSnapshot.matches('debouncingCondition') ||
    samplesSnapshot.matches({ fetching: { documents: 'loading' } });
  const streamName = samplesSnapshot.context.definition.stream.name;
  const hasPrivileges = samplesSnapshot.context.definition.privileges.manage;

  const [viewMode, setViewMode] = useState<PreviewTableMode>('summary');
  const { fieldTypes, dataView: streamDataView } = useStreamDataViewFieldTypes(streamName);

  const { documentsError, approximateMatchingPercentage } = samplesSnapshot.context;
  const documents = selectPreviewDocuments(samplesSnapshot.context);

  const condition = processCondition(samplesSnapshot.context.condition);
  const isProcessedCondition = condition ? isCondition(condition) : true;
  const hasDocuments = !isEmpty(documents);

  const cellActions = useMemo(() => {
    if (!enableActions) {
      return [];
    }

    return buildCellActions(documents, createNewRule, changeRule);
  }, [enableActions, documents, createNewRule, changeRule]);

  const [sorting, setSorting] = useState<{
    fieldName?: string;
    direction: 'asc' | 'desc';
  }>();

  const [visibleColumns, setVisibleColumns] = useState<string[]>();

  const handleSetVisibleColumns = useCallback((newVisibleColumns: string[]) => {
    setVisibleColumns(newVisibleColumns.length > 0 ? newVisibleColumns : undefined);
  }, []);

  const docViewsRegistry = useDocViewerSetup();

  const hits = useMemo(() => {
    return toDataTableRecordWithIndex(documents);
  }, [documents]);

  const { currentDoc, selectedRowIndex, onRowSelected, setExpandedDoc } =
    useDocumentExpansion(hits);

  const rowSelectionContextValue = useMemo(
    () => ({ selectedRowIndex, onRowSelected }),
    [selectedRowIndex, onRowSelected]
  );

  let content: React.ReactNode | null = null;

  if (isLoadingDocuments && !hasDocuments) {
    content = (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiLoadingElastic size="xl" />
      </EuiFlexGroup>
    );
  } else if (documentsError) {
    content = (
      <EuiEmptyPrompt
        icon={<AssetImage type="noResults" />}
        color="danger"
        titleSize="s"
        title={
          <h2>
            {i18n.translate('xpack.streams.streamDetail.preview.error', {
              defaultMessage: 'Error loading preview',
            })}
          </h2>
        }
        body={documentsError.message}
      />
    );
  } else if (!hasDocuments || !isProcessedCondition) {
    content = (
      <EuiEmptyPrompt
        data-test-subj="streamsAppRoutingPreviewEmptyPrompt"
        icon={<AssetImage size="small" type="noDocuments" />}
        titleSize="xxs"
        title={
          <h2 data-test-subj="streamsAppRoutingPreviewEmptyPromptTitle">
            {i18n.translate('xpack.streams.streamDetail.preview.empty', {
              defaultMessage: 'No documents found',
            })}
          </h2>
        }
        body={
          <EuiText size="s" data-test-subj="streamsAppRoutingPreviewEmptyPromptBody">
            {i18n.translate('xpack.streams.streamDetail.preview.emptyBody', {
              defaultMessage:
                "Try a different time range or data sample. Changes can still be applied, but we can't confirm they'll work as expected.",
            })}
          </EuiText>
        }
      />
    );
  } else if (hasDocuments) {
    content = (
      <EuiFlexItem grow data-test-subj="streamsAppRoutingPreviewPanelWithResults">
        <RowSelectionContext.Provider value={rowSelectionContextValue}>
          <MemoPreviewTable
            documents={documents}
            sorting={sorting}
            setSorting={setSorting}
            toolbarVisibility={true}
            displayColumns={visibleColumns}
            setVisibleColumns={handleSetVisibleColumns}
            cellActions={cellActions}
            mode={viewMode}
            streamName={streamName}
            viewModeToggle={{
              currentMode: viewMode,
              setViewMode,
              isDisabled: false,
            }}
            dataViewFieldTypes={fieldTypes}
          />
        </RowSelectionContext.Provider>
        <PreviewFlyout
          currentDoc={currentDoc}
          hits={hits}
          setExpandedDoc={setExpandedDoc}
          docViewsRegistry={docViewsRegistry}
          streamName={streamName}
          streamDataView={streamDataView}
        />
      </EuiFlexItem>
    );
  }

  return (
    <>
      {isUpdating && <EuiProgress size="xs" color="accent" position="absolute" />}
      <EuiFlexGroup gutterSize="m" direction="column">
        {hasPrivileges ? (
          <EuiFlexItem grow={false}>
            <DocumentMatchFilterControls
              onFilterChange={setDocumentMatchFilter}
              matchedDocumentPercentage={approximateMatchingPercentage}
              isDisabled={!!documentsError || !condition || (condition && !isProcessedCondition)}
            />
          </EuiFlexItem>
        ) : (
          <EuiFlexItem grow={false} />
        )}
        {content}
      </EuiFlexGroup>
    </>
  );
};

/**
 * Panel shown when in query mode idle state (no query stream being created)
 */
const QueryModeIdlePanel = () => (
  <EuiEmptyPrompt
    data-test-subj="streamsAppQueryModeIdlePanel"
    icon={<AssetImage />}
    titleSize="xxs"
    title={
      <h2>
        {i18n.translate('xpack.streams.streamDetail.preview.queryModeIdleTitle', {
          defaultMessage: 'Query stream preview',
        })}
      </h2>
    }
    body={
      <EuiText size="s">
        {i18n.translate('xpack.streams.streamDetail.preview.queryModeIdleBody', {
          defaultMessage:
            'Select an existing query stream to view its data, or create a new query stream to see the preview.',
        })}
      </EuiText>
    }
  />
);

/**
 * Panel for previewing query stream ES|QL results during creation
 */
const QueryStreamPreviewPanel = ({
  streamName,
  documents,
  documentsError,
  isLoading,
}: {
  streamName: string;
  documents: SampleDocument[];
  documentsError: Error | undefined;
  isLoading: boolean;
}) => {
  const [viewMode, setViewMode] = useState<PreviewTableMode>('summary');
  const { fieldTypes, dataView: streamDataView } = useStreamDataViewFieldTypes(streamName);
  const hasDocuments = !isEmpty(documents);

  const [sorting, setSorting] = useState<{
    fieldName?: string;
    direction: 'asc' | 'desc';
  }>();

  const [visibleColumns, setVisibleColumns] = useState<string[]>();

  const handleSetVisibleColumns = useCallback((newVisibleColumns: string[]) => {
    setVisibleColumns(newVisibleColumns.length > 0 ? newVisibleColumns : undefined);
  }, []);

  const docViewsRegistry = useDocViewerSetup();

  const hits = useMemo(() => {
    return toDataTableRecordWithIndex(documents);
  }, [documents]);

  const { currentDoc, selectedRowIndex, onRowSelected, setExpandedDoc } =
    useDocumentExpansion(hits);

  const rowSelectionContextValue = useMemo(
    () => ({ selectedRowIndex, onRowSelected }),
    [selectedRowIndex, onRowSelected]
  );

  let content: React.ReactNode | null = null;

  if (isLoading && !hasDocuments) {
    content = (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiLoadingElastic size="xl" />
      </EuiFlexGroup>
    );
  } else if (documentsError) {
    content = (
      <EuiEmptyPrompt
        icon={<AssetImage type="noResults" />}
        color="danger"
        titleSize="s"
        title={
          <h2>
            {i18n.translate('xpack.streams.streamDetail.preview.queryStreamError', {
              defaultMessage: 'Error loading preview',
            })}
          </h2>
        }
        body={documentsError.message}
      />
    );
  } else if (!hasDocuments) {
    content = (
      <EuiEmptyPrompt
        data-test-subj="streamsAppQueryStreamPreviewEmptyPrompt"
        icon={<AssetImage size="small" type="noDocuments" />}
        titleSize="xxs"
        title={
          <h2>
            {i18n.translate('xpack.streams.streamDetail.preview.queryStreamEmpty', {
              defaultMessage: 'No documents found',
            })}
          </h2>
        }
        body={
          <EuiText size="s">
            {i18n.translate('xpack.streams.streamDetail.preview.queryStreamEmptyBody', {
              defaultMessage: 'Try adjusting your ES|QL query or selecting a different time range.',
            })}
          </EuiText>
        }
      />
    );
  } else if (hasDocuments) {
    content = (
      <EuiFlexItem grow data-test-subj="streamsAppQueryStreamPreviewPanelWithResults">
        <RowSelectionContext.Provider value={rowSelectionContextValue}>
          <MemoPreviewTable
            documents={documents}
            sorting={sorting}
            setSorting={setSorting}
            toolbarVisibility={true}
            displayColumns={visibleColumns}
            setVisibleColumns={handleSetVisibleColumns}
            cellActions={[]}
            mode={viewMode}
            streamName={streamName}
            viewModeToggle={{
              currentMode: viewMode,
              setViewMode,
              isDisabled: false,
            }}
            dataViewFieldTypes={fieldTypes}
          />
        </RowSelectionContext.Provider>
        <PreviewFlyout
          currentDoc={currentDoc}
          hits={hits}
          setExpandedDoc={setExpandedDoc}
          docViewsRegistry={docViewsRegistry}
          streamName={streamName}
          streamDataView={streamDataView}
        />
      </EuiFlexItem>
    );
  }

  return (
    <>
      {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem grow={false} />
        {content}
      </EuiFlexGroup>
    </>
  );
};
