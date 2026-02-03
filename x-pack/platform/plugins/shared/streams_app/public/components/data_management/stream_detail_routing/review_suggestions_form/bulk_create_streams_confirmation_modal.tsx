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
  EuiProgress,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { NestedView } from '../../../nested_view';
import { ConditionPanel } from '../../shared';
import { useStreamRoutingEvents } from '../state_management/stream_routing_state_machine';
import { type PartitionSuggestion } from './use_review_suggestions_form';

interface BulkAcceptResult {
  index: number;
  suggestion: PartitionSuggestion;
  success: boolean;
}

export function BulkCreateStreamsConfirmationModal({
  suggestions,
  selectedIndexes,
  onClose,
  onSuccess,
}: {
  suggestions: PartitionSuggestion[];
  selectedIndexes: Set<number>;
  onClose: () => void;
  onSuccess: (successfulIndexes: number[]) => void;
}) {
  const modalTitleId = useGeneratedHtmlId();
  const { forkStream } = useStreamRoutingEvents();

  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BulkAcceptResult[]>([]);

  const selectedSuggestions = Array.from(selectedIndexes)
    .sort((a, b) => a - b)
    .map((index) => ({ index, suggestion: suggestions[index] }));

  const totalCount = selectedSuggestions.length;

  const handleBulkAccept = useCallback(async () => {
    setIsCreating(true);
    setProgress(0);
    setResults([]);

    const bulkResults: BulkAcceptResult[] = [];

    // Process suggestions sequentially to avoid race conditions
    for (let i = 0; i < selectedSuggestions.length; i++) {
      const { index, suggestion } = selectedSuggestions[i];

      try {
        const result = await forkStream({
          destination: suggestion.name,
          where: suggestion.condition,
        });

        bulkResults.push({
          index,
          suggestion,
          success: result.success,
        });
      } catch (error) {
        bulkResults.push({
          index,
          suggestion,
          success: false,
        });
      }

      setProgress(i + 1);
      setResults([...bulkResults]);
    }

    const successfulIndexes = bulkResults
      .filter((result) => result.success)
      .map((result) => result.index);

    // If all succeeded, close the modal and call onSuccess
    if (successfulIndexes.length === totalCount) {
      onSuccess(successfulIndexes);
    }

    setIsCreating(false);
  }, [forkStream, onSuccess, selectedSuggestions, totalCount]);

  const hasFailures = results.some((r) => !r.success);
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;
  const isComplete = results.length === totalCount && !isCreating;

  return (
    <EuiModal
      onClose={isCreating ? () => {} : onClose}
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
        {isCreating && (
          <>
            <EuiProgress
              value={progress}
              max={totalCount}
              size="s"
              color="primary"
              data-test-subj="streamsAppBulkCreateProgress"
            />
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.streams.bulkCreateStreams.progressText', {
                defaultMessage: 'Creating stream {current} of {total}...',
                values: { current: progress, total: totalCount },
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

        {selectedSuggestions.map(({ index, suggestion }, arrayIndex) => {
          const result = results.find((r) => r.index === index);
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
                onClick={onClose}
                data-test-subj="streamsAppBulkCreateStreamsConfirmationModalCloseButton"
              >
                {i18n.translate('xpack.streams.bulkCreateStreams.close', {
                  defaultMessage: 'Close',
                })}
              </EuiButtonEmpty>
              <EuiButton
                onClick={() => {
                  const successfulIndexes = results.filter((r) => r.success).map((r) => r.index);
                  onSuccess(successfulIndexes);
                }}
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
                onClick={onClose}
                isDisabled={isCreating}
                data-test-subj="streamsAppBulkCreateStreamsConfirmationModalCancelButton"
              >
                {i18n.translate('xpack.streams.bulkCreateStreams.cancel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
              <EuiButton
                isLoading={isCreating}
                onClick={handleBulkAccept}
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
