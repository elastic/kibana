/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiLoadingLogo,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import React from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { useAsyncSample } from '../../../hooks/queries/use_async_sample';
import { PreviewTable } from '../preview_table';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';
import { PreviewMatches } from './preview_matches';
import { useStreamsRoutingSelector } from './state_management/stream_routing_state_machine';
import { selectCurrentRule } from './state_management/stream_routing_state_machine/selectors';
import { AssetImage } from '../../asset_image';

export function PreviewPanel() {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);

  const isCreatingNewRule = routingSnapshot.matches({
    ready: { displayingRoutingRules: 'creatingNewRule' },
  });
  const condition = isCreatingNewRule ? selectCurrentRule(routingSnapshot.context)?.if : undefined;
  const definition = routingSnapshot.context.definition;

  const {
    timeRange,
    setTimeRange,
    absoluteTimeRange: { start, end },
  } = data.query.timefilter.timefilter.useTimefilter();

  const {
    isLoadingDocuments,
    documents,
    documentsError,
    refresh,
    approximateMatchingPercentage,
    isLoadingDocumentCounts,
    documentCountsError,
  } = useAsyncSample({
    condition,
    start: start?.valueOf(),
    end: end?.valueOf(),
    size: 100,
    streamDefinition: definition,
  });

  let content;

  if (routingSnapshot.matches({ ready: { displayingRoutingRules: 'idle' } })) {
    content = (
      <EuiEmptyPrompt
        icon={<AssetImage />}
        titleSize="s"
        title={
          <h2>
            {i18n.translate('xpack.streams.streamDetail.preview.editPreviewMessageEmpty', {
              defaultMessage: 'Your preview will appear here',
            })}
          </h2>
        }
        body={i18n.translate(
          'xpack.streams.streamDetail.preview.editPreviewMessageEmptyDescription',
          {
            defaultMessage:
              'Create a new child stream to see what will be routed to it based on the conditions',
          }
        )}
      />
    );
  } else if (routingSnapshot.matches({ ready: { displayingRoutingRules: 'editingRule' } })) {
    content = (
      <EuiEmptyPrompt
        icon={<AssetImage />}
        titleSize="s"
        title={
          <h2>
            {i18n.translate('xpack.streams.streamDetail.preview.editPreviewMessage', {
              defaultMessage: 'Preview is not available while editing streams',
            })}
          </h2>
        }
        body={i18n.translate('xpack.streams.streamDetail.preview.editPreviewMessageBody', {
          defaultMessage:
            'You will find here the result from the conditions you have made once you save the changes',
        })}
      />
    );
  } else if (isCreatingNewRule && isLoadingDocuments) {
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
  } else if (isCreatingNewRule && documentsError) {
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
  } else if (isCreatingNewRule && documents.length === 0) {
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
  } else if (isCreatingNewRule && documents.length > 0) {
    content = (
      <EuiFlexItem grow>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <PreviewMatches
              approximateMatchingPercentage={approximateMatchingPercentage}
              error={documentCountsError}
              isLoading={isLoadingDocumentCounts}
            />
          </EuiFlexItem>
          <PreviewTable documents={documents ?? []} />
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  }

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow>
            <EuiText
              size="s"
              className={css`
                font-weight: bold;
              `}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiIcon type="inspect" />
                {i18n.translate('xpack.streams.streamDetail.preview.header', {
                  defaultMessage: 'Data Preview',
                })}
                {isLoadingDocuments && <EuiLoadingSpinner size="s" />}
              </EuiFlexGroup>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StreamsAppSearchBar
              onQuerySubmit={({ dateRange }, isUpdate) => {
                if (!isUpdate) {
                  refresh();
                  return;
                }

                if (dateRange) {
                  setTimeRange({
                    from: dateRange.from,
                    to: dateRange?.to,
                    mode: dateRange.mode,
                  });
                }
              }}
              onRefresh={() => {
                refresh();
              }}
              dateRangeFrom={timeRange.from}
              dateRangeTo={timeRange.to}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexItem grow>{content}</EuiFlexItem>
    </>
  );
}
