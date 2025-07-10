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
import React from 'react';
import { AssetImage } from '../../asset_image';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';
import { PreviewTable } from '../preview_table';
import { PreviewMatches } from './preview_matches';
import {
  useStreamSamplesSelector,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';

export function PreviewPanel() {
  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);

  let content;

  if (routingSnapshot.matches({ ready: 'idle' })) {
    content = <IdlePanel />;
  } else if (
    routingSnapshot.matches({ ready: 'editingRule' }) ||
    routingSnapshot.matches({ ready: 'reorderingRules' })
  ) {
    content = <EditingPanel />;
  } else if (routingSnapshot.matches({ ready: 'creatingNewRule' })) {
    content = <RuleCreationPanel />;
  }

  return (
    <>
      <EuiFlexItem grow={false}>
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

const IdlePanel = () => (
  <EuiEmptyPrompt
    icon={<AssetImage type="yourPreviewWillAppearHere" />}
    titleSize="s"
    title={
      <h2>
        {i18n.translate('xpack.streams.streamDetail.preview.editPreviewMessageEmpty', {
          defaultMessage: 'Your preview will appear here',
        })}
      </h2>
    }
    body={i18n.translate('xpack.streams.streamDetail.preview.editPreviewMessageEmptyDescription', {
      defaultMessage:
        'Create a new child stream to see what will be routed to it based on the conditions',
    })}
  />
);

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

const RuleCreationPanel = () => {
  const samplesSnapshot = useStreamSamplesSelector((snapshot) => snapshot);
  const isLoadingDocuments = samplesSnapshot.matches({ fetching: { documents: 'loading' } });
  const isUpdating =
    samplesSnapshot.matches('debouncingCondition') ||
    samplesSnapshot.matches({ fetching: { documents: 'loading' } });
  const {
    documents,
    documentsError,
    approximateMatchingPercentage,
    approximateMatchingPercentageError,
  } = samplesSnapshot.context;
  const hasDocuments = !isEmpty(documents);
  const isLoadingDocumentCounts = samplesSnapshot.matches({
    fetching: { documentCounts: 'loading' },
  });

  let content = null;

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
  } else if (!hasDocuments) {
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
      <EuiFlexItem grow>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <PreviewMatches
              approximateMatchingPercentage={approximateMatchingPercentage}
              error={approximateMatchingPercentageError}
              isLoading={isLoadingDocumentCounts}
            />
          </EuiFlexItem>
          <PreviewTable documents={documents} />
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  }

  return (
    <>
      {isUpdating && <EuiProgress size="xs" color="accent" position="absolute" />}
      {content}
    </>
  );
};
