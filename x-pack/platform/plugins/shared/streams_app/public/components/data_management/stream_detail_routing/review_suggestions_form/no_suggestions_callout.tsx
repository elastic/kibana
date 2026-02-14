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
import type { AIFeatures } from '../../../../hooks/use_ai_features';
import type { PartitionSuggestionReason } from './use_review_suggestions_form';

export function NoSuggestionsCallout({
  aiFeatures,
  isLoadingSuggestions,
  onRegenerate,
  onDismiss,
  isDisabled = false,
  reason,
}: {
  aiFeatures: AIFeatures;
  isLoadingSuggestions: boolean;
  onRegenerate: (connectorId: string) => void;
  onDismiss: () => void;
  isDisabled?: boolean;
  reason?: PartitionSuggestionReason;
}) {
  const description =
    reason === 'all_data_partitioned'
      ? i18n.translate(
          'xpack.streams.streamDetailRouting.childStreamList.allDataPartitionedDescription',
          {
            defaultMessage:
              'Good news: all sampled logs in the selected time range already match existing child streams. No additional suggestions are needed.',
          }
        )
      : i18n.translate(
          'xpack.streams.streamDetailRouting.childStreamList.noSuggestionsDescription',
          {
            defaultMessage:
              'No suggestions were generated from the sampled logs. Try a different time range to collect a different sample.',
          }
        );

  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.streams.streamDetailRouting.childStreamList.noSuggestionsTitle',
        {
          defaultMessage: 'No suggestions available',
        }
      )}
      onDismiss={onDismiss}
      color={reason === 'all_data_partitioned' ? 'primary' : 'warning'}
      className={css`
        min-block-size: auto; /* Prevent background clipping */
      `}
      data-test-subj="streamsAppNoSuggestionsCallout"
    >
      <EuiText size="s">{description}</EuiText>
      <EuiSpacer size="m" />
      <GenerateSuggestionButton
        iconType="refresh"
        size="s"
        onClick={onRegenerate}
        isLoading={isLoadingSuggestions}
        aiFeatures={aiFeatures}
        isDisabled={isDisabled}
      >
        {i18n.translate(
          'xpack.streams.streamDetailRouting.childStreamList.regenerateSuggestedPartitions',
          { defaultMessage: 'Regenerate' }
        )}
      </GenerateSuggestionButton>
    </EuiCallOut>
  );
}
