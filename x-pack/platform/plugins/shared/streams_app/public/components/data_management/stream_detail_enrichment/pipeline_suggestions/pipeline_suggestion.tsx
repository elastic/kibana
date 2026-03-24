/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AIFeatures } from '../../../../hooks/use_ai_features';
import { GenerateSuggestionButton } from '../../stream_detail_routing/review_suggestions_form/generate_suggestions_button';
import { useInteractiveModeSelector } from '../state_management/stream_enrichment_state_machine';
import { RootSteps } from '../steps/root_steps';

export interface PipelineSuggestionProps {
  aiFeatures: AIFeatures;
  onAccept(): void;
  onDismiss(): void;
  onRegenerate(connectorId: string): void;
}

export function PipelineSuggestion({
  aiFeatures,
  onAccept,
  onDismiss,
  onRegenerate,
}: PipelineSuggestionProps) {
  const stepRefs = useInteractiveModeSelector((state) => state.context.stepRefs);

  return (
    <EuiCallOut
      iconType="sparkles"
      title={i18n.translate(
        'xpack.streams.processingSuggestion.euiCallOut.reviewProcessingSuggestionsLabel',
        { defaultMessage: 'Review processing suggestions' }
      )}
      color="primary"
      onDismiss={onDismiss}
      css={css`
        flex-shrink: 0;
      `}
      data-test-subj="streamsAppPipelineSuggestionCallout"
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiText size="s">
          {i18n.translate(
            'xpack.streams.processingSuggestion.previewEachSuggestionBeforeTextLabel',
            {
              defaultMessage:
                'Preview each suggestion before accepting, as they will change how your data is ingested. All suggestions are based on the same sample of 100 documents from the original stream.',
            }
          )}
        </EuiText>
        <RootSteps stepRefs={stepRefs} readOnly />
        <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween">
          <EuiFlexItem>
            <GenerateSuggestionButton
              iconType="refresh"
              size="s"
              onClick={onRegenerate}
              aiFeatures={aiFeatures}
            >
              {i18n.translate(
                'xpack.streams.streamDetailRouting.childStreamList.regenerateSuggestedPartitions',
                {
                  defaultMessage: 'Regenerate',
                }
              )}
            </GenerateSuggestionButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onDismiss}
              color="primary"
              size="s"
              data-test-subj="streamsAppPipelineSuggestionRejectButton"
            >
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.grokPatternSuggestion.rejectButton',
                {
                  defaultMessage: 'Reject',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="check"
              onClick={onAccept}
              color="primary"
              size="s"
              fill
              data-test-subj="streamsAppPipelineSuggestionAcceptButton"
            >
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.grokPatternSuggestion.acceptButton',
                {
                  defaultMessage: 'Accept',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
