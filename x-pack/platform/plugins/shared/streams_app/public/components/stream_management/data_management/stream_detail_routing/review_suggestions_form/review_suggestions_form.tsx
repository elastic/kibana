/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiText,
  EuiCallOut,
  EuiSpacer,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCheckbox,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import React, { useCallback, useMemo } from 'react';
import type { Streams } from '@kbn/streams-schema';
import { NestedView } from '../../../../nested_view';
import { RefinementPopover } from './refinement_popover';
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
import type { AIFeatures } from '../../../../../hooks/use_ai_features';

export interface ReviewSuggestionsFormProps
  extends Pick<
    UseReviewSuggestionsFormResult,
    | 'resetForm'
    | 'isLoadingSuggestions'
    | 'previewSuggestion'
    | 'acceptSuggestion'
    | 'rejectSuggestion'
    | 'updateSuggestion'
    | 'selectedSuggestionNames'
    | 'toggleSuggestionSelection'
    | 'isSuggestionSelected'
    | 'selectAllSuggestions'
    | 'clearSuggestionSelection'
  > {
  suggestions: PartitionSuggestion[];
  onRegenerate: (connectorId: string, userPrompt?: string) => void;
  definition: Streams.WiredStream.GetResponse;
  aiFeatures: AIFeatures;
  onBulkAccept: () => void;
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
  selectedSuggestionNames,
  toggleSuggestionSelection,
  isSuggestionSelected,
  onBulkAccept,
  selectAllSuggestions,
  clearSuggestionSelection,
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
  const theme = useEuiTheme();

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

  const allSelected = selectedSuggestionNames.size === suggestions.length && suggestions.length > 0;
  const someSelected =
    selectedSuggestionNames.size > 0 && selectedSuggestionNames.size < suggestions.length;
  const noneSelected = selectedSuggestionNames.size === 0;

  const handleMasterCheckboxChange = useCallback(() => {
    if (allSelected || someSelected) {
      clearSuggestionSelection();
    } else {
      selectAllSuggestions();
    }
  }, [allSelected, someSelected, clearSuggestionSelection, selectAllSuggestions]);

  const masterCheckboxLabel = useMemo(() => {
    if (allSelected) {
      return i18n.translate('xpack.streams.reviewSuggestionsForm.deselectAllLabel', {
        defaultMessage: 'Deselect all suggestions',
      });
    }
    return i18n.translate('xpack.streams.reviewSuggestionsForm.selectAllLabel', {
      defaultMessage: 'Select all suggestions',
    });
  }, [allSelected]);

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
                'Preview each suggestion before accepting - they will change how your data is ingested. All suggestions are based on the same sample: each proposal uses up to 1,000 documents from the stream that are not already matched by enabled child stream routing rules.',
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
            <EuiCheckbox
              id="master-suggestion-checkbox"
              checked={allSelected}
              indeterminate={someSelected}
              onChange={handleMasterCheckboxChange}
              label={i18n.translate('xpack.streams.reviewSuggestionsForm.selectAllCheckbox', {
                defaultMessage: 'Select all',
              })}
              aria-label={masterCheckboxLabel}
              data-test-subj="streamsAppMasterSuggestionCheckbox"
              className={css`
                margin-left: ${theme.euiTheme.size.s};
              `}
            />
            <EuiSpacer size="m" />
            {suggestions.map((partition, index) => (
              <NestedView
                key={partition.name}
                last={index === suggestions.length - 1}
                useDarkBorders
              >
                <SuggestedStreamPanel
                  definition={definition}
                  partition={partition}
                  index={index}
                  onPreview={(toggle) => previewSuggestion(index, toggle)}
                  onDismiss={() => rejectSuggestion(index, selectedPreviewName === partition.name)}
                  onEdit={editSuggestion}
                  onSave={(updatedSuggestion) => updateSuggestion(index, updatedSuggestion)}
                  isSelectedForBulk={isSuggestionSelected(partition.name)}
                  onToggleSelection={() => toggleSuggestionSelection(partition.name)}
                />
                <EuiSpacer size="s" />
              </NestedView>
            ))}
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="check"
                  size="s"
                  fill
                  onClick={onBulkAccept}
                  disabled={noneSelected}
                  data-test-subj="streamsAppAcceptSelectedSuggestionsButton"
                >
                  {i18n.translate('xpack.streams.reviewSuggestionsForm.acceptSelectedButton', {
                    defaultMessage: 'Accept selected ({count})',
                    values: { count: selectedSuggestionNames.size },
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <RefinementPopover
                  onRefine={onRegenerate}
                  isLoading={isLoadingSuggestions}
                  aiFeatures={aiFeatures}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiCallOut>
    </>
  );
}
