/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import { NestedView } from '../../../nested_view';
import { GenerateSuggestionButton } from './generate_suggestions_button';
import { SuggestedStreamPanel } from './suggested_stream_panel';
import type {
  PartitionSuggestion,
  UseReviewSuggestionsFormResult,
} from './use_review_suggestions_form';
import {
  useStreamSamplesSelector,
  useStreamsRoutingSelector,
  useStreamRoutingEvents,
} from '../state_management/stream_routing_state_machine';
import { CreateStreamConfirmationModal } from './create_stream_confirmation_modal';
import type { AIFeatures } from '../../../../hooks/use_ai_features';

export interface ReviewSuggestionsFormProps
  extends Pick<
    UseReviewSuggestionsFormResult,
    | 'resetForm'
    | 'isLoadingSuggestions'
    | 'previewSuggestion'
    | 'acceptSuggestion'
    | 'rejectSuggestion'
    | 'updateSuggestion'
  > {
  suggestions: PartitionSuggestion[];
  onRegenerate: (connectorId: string) => void;
  definition: Streams.WiredStream.GetResponse;
  aiFeatures: AIFeatures;
}

export function ReviewSuggestionsForm({
  definition,
  aiFeatures,
  resetForm,
  suggestions,
  isLoadingSuggestions,
  previewSuggestion,
  acceptSuggestion,
  rejectSuggestion,
  updateSuggestion,
  onRegenerate,
}: ReviewSuggestionsFormProps) {
  const ruleUnderReview = useStreamsRoutingSelector((snapshot) =>
    snapshot.matches({ ready: { ingestMode: 'reviewSuggestedRule' } })
      ? snapshot.context.suggestedRuleId
      : null
  );

  const isEditingOrReorderingStreams = useStreamsRoutingSelector(
    (snapshot) =>
      snapshot.matches({ ready: { ingestMode: 'editingRule' } }) ||
      snapshot.matches({ ready: { ingestMode: 'reorderingRules' } })
  );

  const partitionForModal = ruleUnderReview
    ? suggestions.find(({ name }) => name === ruleUnderReview)
    : undefined;

  const selectedPreviewName = useStreamSamplesSelector(
    ({ context }) =>
      context.selectedPreview &&
      context.selectedPreview.type === 'suggestion' &&
      context.selectedPreview.name
  );

  const { editSuggestion } = useStreamRoutingEvents();

  return (
    <>
      {ruleUnderReview && partitionForModal && (
        <CreateStreamConfirmationModal
          partition={partitionForModal}
          onSuccess={() => {
            acceptSuggestion(suggestions.findIndex(({ name }) => name === ruleUnderReview)!);
          }}
        />
      )}
      <EuiCallOut
        iconType="sparkles"
        title={i18n.translate(
          'xpack.streams.reviewSuggestionsForm.euiCallOut.reviewPartitioningSuggestionsLabel',
          { defaultMessage: 'Review partitioning suggestions' }
        )}
        onDismiss={resetForm}
        className={css`
          min-block-size: auto; /* Prevent background clipping */
        `}
        data-test-subj="streamsAppReviewPartitioningSuggestionsCallout"
      >
        <EuiText size="s">
          {i18n.translate(
            'xpack.streams.streamDetailRouting.childStreamList.suggestPartitionsDescription',
            {
              defaultMessage:
                'Preview each suggestion before accepting - They will change how your data is ingested. All suggestions are based on the same sample: each proposal uses 1,000 documents from the original stream.',
            }
          )}
        </EuiText>
        <EuiSpacer size="m" />
        {isEditingOrReorderingStreams ? (
          <>
            <EuiCallOut
              size="s"
              color="primary"
              iconType="info"
              title={i18n.translate('xpack.streams.reviewSuggestionsForm.actionsDisabled', {
                defaultMessage: 'Finish editing or reordering streams to interact with suggestions',
              })}
            />
            <EuiSpacer size="m" />
          </>
        ) : (
          <>
            {suggestions.map((partition, index) => (
              <NestedView key={partition.name} last={index === suggestions.length - 1}>
                <SuggestedStreamPanel
                  definition={definition}
                  partition={partition}
                  index={index}
                  onPreview={(toggle) => previewSuggestion(index, toggle)}
                  onDismiss={() => rejectSuggestion(index, selectedPreviewName === partition.name)}
                  onEdit={editSuggestion}
                  onSave={(updatedSuggestion) => updateSuggestion(index, updatedSuggestion)}
                />
                <EuiSpacer size="s" />
              </NestedView>
            ))}
            <EuiSpacer size="m" />
            <GenerateSuggestionButton
              iconType="refresh"
              size="s"
              onClick={onRegenerate}
              isLoading={isLoadingSuggestions}
              aiFeatures={aiFeatures}
            >
              {i18n.translate(
                'xpack.streams.streamDetailRouting.childStreamList.regenerateSuggestedPartitions',
                {
                  defaultMessage: 'Regenerate',
                }
              )}
            </GenerateSuggestionButton>
          </>
        )}
      </EuiCallOut>
    </>
  );
}
