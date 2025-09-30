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
import { getSegments, MAX_NESTING_LEVEL } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import React, { useMemo, useState } from 'react';
import { useDocViewerSetup } from '../../../hooks/use_doc_viewer_setup';
import { useDocumentExpansion } from '../../../hooks/use_document_expansion';
import { AssetImage } from '../../asset_image';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';
import { MemoPreviewTable, PreviewFlyout } from '../shared';
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

export function PreviewPanel() {
  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);
  const { definition } = routingSnapshot.context;
  const canCreateRoutingRules = routingSnapshot.can({ type: 'routingRule.create' });
  const maxNestingLevel = getSegments(definition.stream.name).length >= MAX_NESTING_LEVEL;

  let content;

  if (routingSnapshot.matches({ ready: 'idle' })) {
    content = <SamplePreviewPanel enableActions={canCreateRoutingRules && !maxNestingLevel} />;
  } else if (
    routingSnapshot.matches({ ready: 'editingRule' }) ||
    routingSnapshot.matches({ ready: 'reorderingRules' })
  ) {
    content = <EditingPanel />;
  } else if (routingSnapshot.matches({ ready: 'creatingNewRule' })) {
    content = <SamplePreviewPanel enableActions />;
  }

  return (
    <>
      <EuiFlexItem grow={false} data-test-subj="routingPreviewPanel">
        <EuiFlexGroup justifyContent="spaceBetween" wrap>
          <EuiFlexGroup component="span" gutterSize="s">
            <EuiIcon type="inspect" />
            <strong>
              {i18n.translate('xpack.streams.streamDetail.preview.header', {
                defaultMessage: 'Data Preview',
              })}
            </strong>
          </EuiFlexGroup>
          <StreamsAppSearchBar showDatePicker />
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow>{content}</EuiFlexItem>
    </>
  );
}

const EditingPanel = () => (
  <EuiEmptyPrompt
    icon={<AssetImage />}
    titleSize="xxs"
    title={
      <h2>
        {i18n.translate('xpack.streams.streamDetail.preview.editPreviewMessage', {
          defaultMessage: 'Preview is not available while editing or reordering streams',
        })}
      </h2>
    }
    body={
      <>
        <EuiText size="xs">
          <p>
            {i18n.translate('xpack.streams.streamDetail.preview.editPreviewMessageBody', {
              defaultMessage:
                'Once you save your changes, the results of your conditions will appear here.',
            })}
          </p>
          <p>
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
  const streamName = useStreamSamplesSelector(
    (snapshot) => snapshot.context.definition.stream.name
  );

  const { documentsError, approximateMatchingPercentage } = samplesSnapshot.context;
  const documents = useStreamSamplesSelector((snapshot) =>
    selectPreviewDocuments(snapshot.context)
  );

  const condition = processCondition(samplesSnapshot.context.condition);
  const isProcessedCondition = condition ? isCondition(condition) : true;
  const hasDocuments = !isEmpty(documents);

  const cellActions = useMemo(() => {
    if (!enableActions) {
      return [];
    }

    return buildCellActions(documents, createNewRule, changeRule);
  }, [enableActions, documents, createNewRule, changeRule]);

  const matchedDocumentPercentage = isNaN(parseFloat(approximateMatchingPercentage ?? ''))
    ? Number.NaN
    : parseFloat(approximateMatchingPercentage!);

  const [sorting, setSorting] = useState<{
    fieldName?: string;
    direction: 'asc' | 'desc';
  }>();

  const [visibleColumns, setVisibleColumns] = useState<string[]>();

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
        icon={<AssetImage type="noResults" />}
        titleSize="xxs"
        title={
          <h2>
            {i18n.translate('xpack.streams.streamDetail.preview.empty', {
              defaultMessage: 'No documents to preview',
            })}
          </h2>
        }
      />
    );
  } else if (hasDocuments) {
    content = (
      <EuiFlexItem grow data-test-subj="routingPreviewPanelWithResults">
        <RowSelectionContext.Provider value={rowSelectionContextValue}>
          <MemoPreviewTable
            documents={documents}
            sorting={sorting}
            setSorting={setSorting}
            toolbarVisibility={true}
            displayColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
            cellActions={cellActions}
          />
        </RowSelectionContext.Provider>
        <PreviewFlyout
          currentDoc={currentDoc}
          hits={hits}
          setExpandedDoc={setExpandedDoc}
          docViewsRegistry={docViewsRegistry}
          streamName={streamName}
        />
      </EuiFlexItem>
    );
  }

  return (
    <>
      {isUpdating && <EuiProgress size="xs" color="accent" position="absolute" />}
      <EuiFlexGroup gutterSize="m" direction="column">
        {!isNaN(matchedDocumentPercentage) && (
          <DocumentMatchFilterControls
            initialFilter={samplesSnapshot.context.documentMatchFilter}
            onFilterChange={setDocumentMatchFilter}
            matchedDocumentPercentage={Math.round(matchedDocumentPercentage)}
            isDisabled={!!documentsError || !condition}
          />
        )}
        {content}
      </EuiFlexGroup>
    </>
  );
};
