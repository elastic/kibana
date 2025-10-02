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
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import { NestedView } from '../../../nested_view';
import { FormProvider } from './use_review_suggestions_form';
import { GenerateSuggestionButton } from './generate_suggestions_button';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { SuggestedStreamPanel } from './suggested_stream_panel';
import { useReviewSuggestionsFormContext } from './use_review_suggestions_form';
import type { AIFeatures } from '../../../../hooks/use_ai_features';

export interface ReviewSuggestionsFormProps {
  definition: Streams.WiredStream.GetResponse;
  aiFeatures: AIFeatures;
}

export function ReviewSuggestionsForm({ definition, aiFeatures }: ReviewSuggestionsFormProps) {
  const { timeState } = useTimefilter();
  const {
    reviewSuggestionsForm,
    resetForm,
    suggestions,
    isLoadingSuggestions,
    fetchSuggestions,
    previewSuggestion,
    acceptSuggestion,
    rejectSuggestion,
  } = useReviewSuggestionsFormContext();

  // Reset suggestions when navigating to a different stream
  useUpdateEffect(() => {
    resetForm();
  }, [definition.stream.name]);

  return (
    <FormProvider {...reviewSuggestionsForm}>
      <EuiCallOut
        announceOnMount
        title={i18n.translate(
          'xpack.streams.reviewSuggestionsForm.euiCallOut.reviewPartitioningSuggestionsLabel',
          { defaultMessage: 'Review partitioning suggestions' }
        )}
        onDismiss={resetForm}
        className={css`
          min-block-size: auto; /* Prevent background clipping */
        `}
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
        {suggestions.map((partition, index) => (
          <NestedView key={partition.id} last={index === suggestions.length - 1}>
            <SuggestedStreamPanel
              definition={definition}
              partition={partition}
              onPreview={(toggle) => previewSuggestion(index, toggle)}
              onDismiss={() => rejectSuggestion(index)}
              onSuccess={() => acceptSuggestion(index)}
            />
            <EuiSpacer size="s" />
          </NestedView>
        ))}
        <EuiSpacer size="m" />
        <GenerateSuggestionButton
          iconType="refresh"
          size="s"
          onClick={(connectorId) =>
            fetchSuggestions({
              streamName: definition.stream.name,
              connectorId,
              start: timeState.start,
              end: timeState.end,
            })
          }
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
      </EuiCallOut>
    </FormProvider>
  );
}
