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

export function NoSuggestionsCallout({
  aiFeatures,
  isLoadingSuggestions,
  onRegenerate,
  onDismiss,
  isDisabled = false,
}: {
  aiFeatures: AIFeatures;
  isLoadingSuggestions: boolean;
  onRegenerate: (connectorId: string) => void;
  onDismiss: () => void;
  isDisabled?: boolean;
}) {
  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.streams.streamDetailRouting.childStreamList.noSuggestionsTitle',
        {
          defaultMessage: 'No suggestions available',
        }
      )}
      onDismiss={onDismiss}
      className={css`
        min-block-size: auto; /* Prevent background clipping */
      `}
      data-test-subj="streamsAppNoSuggestionsCallout"
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
