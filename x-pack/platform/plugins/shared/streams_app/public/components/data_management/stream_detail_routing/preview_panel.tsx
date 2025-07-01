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
import React, { useEffect } from 'react';
import { useAsyncSample } from '../../../hooks/queries/use_async_sample';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { useDebounced } from '../../../util/use_debounce';
import { AssetImage } from '../../asset_image';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';
import { PreviewTable } from '../preview_table';
import { PreviewMatches } from './preview_matches';
import {
  selectCurrentRule,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';

export function PreviewPanel() {
  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);

  const isIdle = routingSnapshot.matches({ ready: 'idle' });
  const isCreatingNewRule = routingSnapshot.matches({ ready: 'creatingNewRule' });
  const isEditingRule = routingSnapshot.matches({ ready: 'editingRule' });
  const isReorideringRules = routingSnapshot.matches({ ready: 'reorderingRules' });

  const condition = isCreatingNewRule ? selectCurrentRule(routingSnapshot.context).if : undefined;
  const definition = routingSnapshot.context.definition;

  const debouncedCondition = useDebounced(condition, 300);

  const { timeState, timeState$ } = useTimefilter();

  const {
    isLoadingDocuments,
    documents,
    documentsError,
    refresh,
    approximateMatchingPercentage,
    isLoadingDocumentCounts,
    documentCountsError,
  } = useAsyncSample({
    condition: debouncedCondition,
    start: timeState.start,
    end: timeState.end,
    size: 100,
    streamDefinition: definition,
  });

  const hasDocuments = !isEmpty(documents);

  useEffect(() => {
    const subscription = timeState$.subscribe({
      next: ({ kind }) => {
        if (kind === 'override') {
          refresh();
        }
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [timeState$, refresh]);

  let content;

  if (isIdle) {
    content = (
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
        body={i18n.translate(
          'xpack.streams.streamDetail.preview.editPreviewMessageEmptyDescription',
          {
            defaultMessage:
              'Create a new child stream to see what will be routed to it based on the conditions',
          }
        )}
      />
    );
  } else if (isEditingRule || isReorideringRules) {
    content = (
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
                  'You will find here the result from the conditions you have made once you save the changes',
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
  } else if (isCreatingNewRule && isLoadingDocuments && !hasDocuments) {
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
  } else if (isCreatingNewRule && !hasDocuments) {
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
  } else if (isCreatingNewRule && hasDocuments) {
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
        {isLoadingDocuments && <EuiProgress size="xs" color="accent" position="absolute" />}
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
