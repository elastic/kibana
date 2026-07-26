/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo } from 'react';
import { NestedView } from '../../../../nested_view';
import { ConditionPanel } from '../../shared';
import {
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from '../state_management/stream_routing_state_machine';
import { type PartitionSuggestion } from './use_review_suggestions_form';

export function BulkCreateStreamsConfirmationModal({
  suggestions,
  selectedNames,
  onClose,
  onSuccess,
}: {
  suggestions: PartitionSuggestion[];
  selectedNames: Set<string>;
  onClose: () => void;
  onSuccess: (successfulNames: string[]) => void;
}) {
  const modalTitleId = useGeneratedHtmlId();
  const { bulkForkStreams, acknowledgeBulkFork } = useStreamRoutingEvents();

  const bulkFork = useStreamsRoutingSelector((snapshot) => snapshot.context.bulkFork);
  const isForking = useStreamsRoutingSelector(
    (snapshot) =>
      snapshot.matches({ ready: { ingestMode: { bulkForking: 'forking' } } }) ||
      snapshot.matches({ ready: { ingestMode: { bulkForking: 'evaluating' } } })
  );
  const isComplete = useStreamsRoutingSelector((snapshot) =>
    snapshot.matches({ ready: { ingestMode: { bulkForking: 'complete' } } })
  );

  const selectedSuggestions = useMemo(
    () => suggestions.filter((s) => selectedNames.has(s.name)),
    [selectedNames, suggestions]
  );

  const totalCount = selectedSuggestions.length;
  const results = useMemo(() => bulkFork?.results ?? [], [bulkFork?.results]);
  const progress = results.length;
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.length - successCount;
  const hasFailures = failureCount > 0;

  const handleConfirm = useCallback(() => {
    const items = selectedSuggestions.map((suggestion) => ({
      name: suggestion.name,
      condition: suggestion.condition,
    }));
    bulkForkStreams(items);
  }, [bulkForkStreams, selectedSuggestions]);

  useEffect(() => {
    if (isComplete && !hasFailures && results.length > 0) {
      const successfulNames = results.map((r) => r.name);
      acknowledgeBulkFork();
      onSuccess(successfulNames);
    }
  }, [isComplete, hasFailures, results, acknowledgeBulkFork, onSuccess]);

  const handleClose = useCallback(() => {
    if (isComplete && bulkFork) {
      acknowledgeBulkFork();
    }
    onClose();
  }, [isComplete, bulkFork, acknowledgeBulkFork, onClose]);

  const handleDone = useCallback(() => {
    const successfulNames = results.filter((r) => r.success).map((r) => r.name);
    acknowledgeBulkFork();
    onSuccess(successfulNames);
  }, [results, acknowledgeBulkFork, onSuccess]);

  return (
    <EuiModal
      onClose={handleClose}
      aria-labelledby={modalTitleId}
      data-test-subj="streamsAppBulkCreateStreamsConfirmationModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle
          id={modalTitleId}
          data-test-subj="streamsAppBulkCreateStreamsConfirmationModalTitle"
        >
          {i18n.translate('xpack.streams.bulkCreateStreams.confirmTitle', {
            defaultMessage: 'Create {count} streams',
            values: { count: totalCount },
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {isForking && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.streams.bulkCreateStreams.progressText', {
                defaultMessage: 'Creating stream {current} of {total}...',
                values: { current: progress + 1, total: totalCount },
              })}
            </EuiText>
            <EuiSpacer size="m" />
          </>
        )}

        {isComplete && hasFailures && (
          <>
            <EuiCallOut
              color="warning"
              iconType="warning"
              title={i18n.translate('xpack.streams.bulkCreateStreams.partialSuccessTitle', {
                defaultMessage: 'Some streams could not be created',
              })}
              data-test-subj="streamsAppBulkCreatePartialSuccessCallout"
            >
              <EuiText size="s">
                {i18n.translate('xpack.streams.bulkCreateStreams.partialSuccessDescription', {
                  defaultMessage:
                    '{successCount} of {totalCount} streams were created successfully. {failureCount} failed.',
                  values: { successCount, totalCount, failureCount },
                })}
              </EuiText>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        <EuiText size="s">
          {i18n.translate('xpack.streams.bulkCreateStreams.description', {
            defaultMessage: 'The following streams will be created:',
          })}
        </EuiText>
        <EuiSpacer size="m" />

        {selectedSuggestions.map((suggestion, arrayIndex) => {
          const result = results.find((r) => r.name === suggestion.name);
          const hasResult = result !== undefined;
          const isSuccess = result?.success === true;

          return (
            <NestedView key={suggestion.name} last={arrayIndex === selectedSuggestions.length - 1}>
              <EuiFlexGroup
                direction="column"
                gutterSize="xs"
                data-test-subj={`streamsAppBulkCreateStreamItem-${suggestion.name}`}
              >
                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <strong>{suggestion.name}</strong>
                      </EuiText>
                    </EuiFlexItem>
                    {hasResult && (
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color={isSuccess ? 'success' : 'danger'}>
                          {isSuccess
                            ? i18n.translate('xpack.streams.bulkCreateStreams.statusCreated', {
                                defaultMessage: 'Created',
                              })
                            : i18n.translate('xpack.streams.bulkCreateStreams.statusFailed', {
                                defaultMessage: 'Failed',
                              })}
                        </EuiText>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <ConditionPanel condition={suggestion.condition} />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
            </NestedView>
          );
        })}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m">
          {isComplete && hasFailures ? (
            <>
              <EuiButtonEmpty
                onClick={handleClose}
                data-test-subj="streamsAppBulkCreateStreamsConfirmationModalCloseButton"
              >
                {i18n.translate('xpack.streams.bulkCreateStreams.close', {
                  defaultMessage: 'Close',
                })}
              </EuiButtonEmpty>
              <EuiButton
                onClick={handleDone}
                fill
                data-test-subj="streamsAppBulkCreateStreamsConfirmationModalDoneButton"
              >
                {i18n.translate('xpack.streams.bulkCreateStreams.done', {
                  defaultMessage: 'Done',
                })}
              </EuiButton>
            </>
          ) : (
            <>
              <EuiButtonEmpty
                onClick={handleClose}
                data-test-subj="streamsAppBulkCreateStreamsConfirmationModalCancelButton"
              >
                {i18n.translate('xpack.streams.bulkCreateStreams.cancel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
              <EuiButton
                isLoading={isForking}
                onClick={handleConfirm}
                fill
                data-test-subj="streamsAppBulkCreateStreamsConfirmationModalCreateButton"
              >
                {i18n.translate('xpack.streams.bulkCreateStreams.confirm', {
                  defaultMessage: 'Create all streams',
                })}
              </EuiButton>
            </>
          )}
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
