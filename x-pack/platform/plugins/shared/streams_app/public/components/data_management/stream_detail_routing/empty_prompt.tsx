/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  useEuiTheme,
  EuiEmptyPrompt,
  EuiText,
  EuiCard,
  EuiButton,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import type { AIFeatures } from '../../../hooks/use_ai_features';
import { GenerateSuggestionButton } from './review_suggestions_form/generate_suggestions_button';

interface NoDataEmptyPromptProps {
  aiFeatures: AIFeatures | null;
  getSuggestionsForStream: (connectorId: string) => void;
  isLoadingSuggestions: boolean;
  isEditingOrReorderingStreams: boolean;
  createNewRule: () => void;
}

export const NoDataEmptyPrompt = ({
  aiFeatures,
  getSuggestionsForStream,
  isLoadingSuggestions,
  isEditingOrReorderingStreams,
  createNewRule,
}: NoDataEmptyPromptProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiEmptyPrompt
      aria-live="polite"
      titleSize="xs"
      layout="horizontal"
      className={css`
        margin: unset;
        padding: ${euiTheme.size.xxl};
      `}
      title={
        <h2>
          {i18n.translate('xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.title', {
            defaultMessage: 'Partition your data',
          })}
        </h2>
      }
      body={
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiText size="s">
              {i18n.translate('xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.body', {
                defaultMessage:
                  'Define how your data is split into streams. You can create partitions yourself, or let Elastic suggest an AI-generated proposal based on your data.',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiSpacer size="m" />
          {aiFeatures && aiFeatures.enabled && (
            <EuiCard
              layout="horizontal"
              display="transparent"
              hasBorder
              titleSize="s"
              title={i18n.translate(
                'xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.cardTitle',
                {
                  defaultMessage: 'Suggest partitioning',
                }
              )}
              description={
                <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      {i18n.translate(
                        'xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.cardDescription',
                        {
                          defaultMessage:
                            'Use the power of AI to generate the most effective partitioning',
                        }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <GenerateSuggestionButton
                      size="s"
                      onClick={getSuggestionsForStream}
                      isLoading={isLoadingSuggestions}
                      isDisabled={isEditingOrReorderingStreams}
                      aiFeatures={aiFeatures}
                    >
                      {i18n.translate(
                        'xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.cardButton',
                        {
                          defaultMessage: 'Suggest partitions',
                        }
                      )}
                    </GenerateSuggestionButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
            />
          )}
          <EuiSpacer size="s" />
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem>
                <EuiHorizontalRule margin="none" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  color="text"
                  fill={false}
                  data-test-subj="streamsAppStreamDetailRoutingAddRuleButton"
                  onClick={createNewRule}
                >
                  {i18n.translate(
                    'xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.manualButton',
                    {
                      defaultMessage: 'Create manually',
                    }
                  )}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiHorizontalRule margin="none" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};
