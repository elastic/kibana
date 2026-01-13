/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiMarkdownFormat,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useAbortController } from '@kbn/react-hooks';
import { getFormattedError } from '../../../../util/errors';
import { useAIFeatures } from '../../../../hooks/use_ai_features';
import { useKibana } from '../../../../hooks/use_kibana';
import { ConnectorListButton } from '../../../connector_list_button/connector_list_button';
import { FeedbackButtons } from './feedback_buttons';

export function Summary({ count }: { count: number }) {
  const { signal } = useAbortController();
  const aiFeatures = useAIFeatures();
  const {
    core: { notifications },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const onGenerateSummaryClick = useCallback(async () => {
    if (!aiFeatures?.genAiConnectors.selectedConnector) {
      return;
    }

    setIsGeneratingSummary(true);

    streamsRepositoryClient
      .stream('POST /internal/streams/_significant_events/_generate_summary', {
        signal,
        params: {
          query: {
            connectorId: aiFeatures.genAiConnectors.selectedConnector,
          },
        },
      })
      .subscribe({
        next({ summary: generatedSummary, tokenUsage }) {
          setSummary(generatedSummary);
          notifications.toasts.addSuccess({
            title: i18n.translate(
              'xpack.streams.significantEventsSummary.generatedSummarySuccessToastTitle',
              { defaultMessage: 'Summary generated successfully' }
            ),
          });
          // Need to add telemetry for token usage later
        },
        complete() {
          setIsGeneratingSummary(false);
        },
        error(error) {
          setIsGeneratingSummary(false);
          notifications.toasts.addError(error, {
            title: i18n.translate(
              'xpack.streams.significantEventsSummary.generatingSummaryErrorToastTitle',
              { defaultMessage: 'Failed to generate summary' }
            ),
            toastMessage: getFormattedError(error).message,
          });
        },
      });
  }, [
    aiFeatures?.genAiConnectors.selectedConnector,
    notifications.toasts,
    signal,
    streamsRepositoryClient,
  ]);

  if (summary) {
    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="none">
            <EuiPanel color="subdued" hasShadow={false}>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h2>
                      {i18n.translate('xpack.streams.summary.insightsSummaryPanelLabel', {
                        defaultMessage: 'Insights summary',
                      })}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <FeedbackButtons />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
            <EuiPanel hasShadow={false}>
              <EuiMarkdownFormat>{summary}</EuiMarkdownFormat>
            </EuiPanel>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiPanel color="subdued">
          <EuiFlexGroup
            direction="column"
            alignItems="center"
            justifyContent="center"
            style={{ minHeight: '30vh', minWidth: '40vh' }}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="createAdvancedJob" size="xxl" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>
                  {i18n.translate(
                    'xpack.streams.sigEventsDiscovery.insightsTab.significantEventsFoundTitle',
                    {
                      defaultMessage:
                        '{count} significant {count, plural, one {event} other {events}} detected',
                      values: {
                        count,
                      },
                    }
                  )}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" textAlign="center" css={{ maxWidth: 400 }}>
                {i18n.translate(
                  'xpack.streams.sigEventsDiscovery.insightsTab.significantEventsFoundDescription',
                  {
                    defaultMessage:
                      'Start extracting insights from your logs, and understand what they mean with the power of AI and Elastic Observability.',
                  }
                )}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ConnectorListButton
                buttonProps={{
                  fill: true,
                  size: 'm',
                  iconType: 'sparkles',
                  children: isGeneratingSummary
                    ? i18n.translate(
                        'xpack.streams.significantEventsSummary.generatingInsightsButtonLabel',
                        {
                          defaultMessage: 'Generating insights',
                        }
                      )
                    : i18n.translate(
                        'xpack.streams.significantEventsSummary.generateSummaryButtonLabel',
                        {
                          defaultMessage: 'Generate insights',
                        }
                      ),
                  onClick: onGenerateSummaryClick,
                  isDisabled: summary !== null,
                  isLoading: isGeneratingSummary,
                  'data-test-subj': 'significant_events_generate_summary_button',
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
