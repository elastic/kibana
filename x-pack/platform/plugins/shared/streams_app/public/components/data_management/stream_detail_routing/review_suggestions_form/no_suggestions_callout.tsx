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
import { GenerateSuggestionButton } from './generate_suggestions_button';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { useReviewSuggestionsFormContext } from './use_review_suggestions_form';
import type { ReviewSuggestionsFormProps } from './review_suggestions_form';

export function NoSuggestionsCallout({ definition, aiFeatures }: ReviewSuggestionsFormProps) {
  const { timeState } = useTimefilter();
  const { resetForm, isLoadingSuggestions, fetchSuggestions } = useReviewSuggestionsFormContext();

  return (
    <EuiCallOut
      announceOnMount
      title={i18n.translate(
        'xpack.streams.streamDetailRouting.childStreamList.noSuggestionsTitle',
        {
          defaultMessage: 'No suggestions available',
        }
      )}
      onDismiss={resetForm}
      className={css`
        min-block-size: auto; /* Prevent background clipping */
      `}
    >
      <EuiText size="s">
        {i18n.translate(
          'xpack.streams.streamDetailRouting.childStreamList.noSuggestionsDescription',
          {
            defaultMessage: 'Retry using a different time range.',
          }
        )}
      </EuiText>
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
  );
}
