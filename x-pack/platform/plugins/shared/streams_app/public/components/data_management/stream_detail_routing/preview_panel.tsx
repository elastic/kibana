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
  EuiLoadingLogo,
  EuiProgress,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React, { useState, useMemo } from 'react';
import { isCondition } from '@kbn/streamlang';
import { useDocViewerSetup } from '../../../hooks/use_doc_viewer_setup';
import { useDocumentExpansion } from '../../../hooks/use_document_expansion';
import { AssetImage } from '../../asset_image';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';
import {
  selectPreviewDocuments,
  useStreamRoutingEvents,
  useStreamSamplesSelector,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';
import { DocumentMatchFilterControls } from './document_match_filter_controls';
import { processCondition, toDataTableRecordWithIndex } from './utils';
import { MemoPreviewTable, PreviewFlyout } from '../shared';

export function PreviewPanel() {
  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);

  let content;

  if (routingSnapshot.matches({ ready: 'idle' })) {
    content = <SamplePreviewPanel />;
  } else if (
    routingSnapshot.matches({ ready: 'editingRule' }) ||
    routingSnapshot.matches({ ready: 'reorderingRules' })
  ) {
    content = <EditingPanel />;
  } else if (routingSnapshot.matches({ ready: 'creatingNewRule' })) {
    content = <SamplePreviewPanel />;
  }

  return (
    <>
      <EuiFlexItem grow={false} data-test-subj="routingPreviewPanel">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" wrap>
          <EuiFlexGroup component="span" gutterSize="s" alignItems="center">
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
      <EuiSpacer size="s" />
      <EuiFlexItem grow>{content}</EuiFlexItem>
    </>
  );
}

const EditingPanel = () => (
  <EuiEmptyPrompt
    icon={<AssetImage />}
    titleSize="s"
    title={
      <h2>
        {i18n.translate('xpack.streams.streamDetail.preview.editPreviewMessage', {
          defaultMessage: 'Preview is not available while editing or reordering streams',
        })}
      </h2>
    }
    body={
      <>
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
      </>
    }
  />
);

const SamplePreviewPanel = () => {
  const samplesSnapshot = useStreamSamplesSelector((snapshot) => snapshot);
  const { setDocumentMatchFilter } = useStreamRoutingEvents();
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

  let content: React.ReactNode | null = null;

  if (isLoadingDocuments && !hasDocuments) {
    content = (
      <EuiEmptyPrompt
        icon={<EuiLoadingLogo logo="logoLogging" size="xl" />}
        titleSize="s"
        title={
          <h2>
            {i18n.translate('xpack.streams.streamDetail.preview.loadingPreviewTitle', {
              defaultMessage: 'Loading routing preview',
            })}
          </h2>
        }
        body={i18n.translate('xpack.streams.streamDetail.preview.loadingPreviewBody', {
          defaultMessage:
            'This may take a few moments depending on the complexity of the conditions and the amount of data',
        })}
      />
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
        titleSize="s"
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
        <MemoPreviewTable
          documents={documents}
          sorting={sorting}
          setSorting={setSorting}
          toolbarVisibility={true}
          displayColumns={visibleColumns}
          setVisibleColumns={setVisibleColumns}
          selectedRowIndex={selectedRowIndex}
          onRowSelected={onRowSelected}
        />
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
        <DocumentMatchFilterControls
          initialFilter={samplesSnapshot.context.documentMatchFilter}
          onFilterChange={setDocumentMatchFilter}
          matchedDocumentPercentage={Math.round(matchedDocumentPercentage)}
          isDisabled={!!documentsError || !condition}
        />
        {content}
      </EuiFlexGroup>
    </>
  );
};
