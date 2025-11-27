/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiMarkdownFormat,
  EuiSpacer,
} from '@elastic/eui';
import { useAbortController } from '@kbn/react-hooks';
import { getFormattedError } from '../../../util/errors';
import { useAIFeatures } from '../../../hooks/use_ai_features';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { ConnectorListButton } from '../../connector_list_button/connector_list_button';
import { FeedbackButtons } from './feedback_buttons';

export function Occurrences() {
  const { signal } = useAbortController();
  const aiFeatures = useAIFeatures();
  const {
    core: { notifications },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    services: { telemetryClient },
  } = useKibana();
  const router = useStreamsAppRouter();

  const occurrencesFetch = useStreamsAppFetch(
    async ({ signal: abortSignal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams/_significant_events/_occurrences', {
        signal: abortSignal,
      }),
    [streamsRepositoryClient]
  );

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
          telemetryClient.trackSignificantEventsSummaryGenerated({
            number_of_streams: occurrencesFetch.value?.total_streams ?? -1,
            number_of_queries: occurrencesFetch.value?.total_queries ?? -1,
            number_of_events: occurrencesFetch.value?.total_occurrences ?? -1,
            input_tokens_used: tokenUsage.prompt,
            output_tokens_used: tokenUsage.completion,
          });
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
    occurrencesFetch.value?.total_occurrences,
    occurrencesFetch.value?.total_queries,
    occurrencesFetch.value?.total_streams,
    signal,
    streamsRepositoryClient,
    telemetryClient,
  ]);

  if (occurrencesFetch.loading) {
    return (
      <EuiCallOut
        announceOnMount={false}
        title={i18n.translate('xpack.streams.significantEventsSummary.loadingSummaryTitle', {
          defaultMessage: 'Loading Significant events summary...',
        })}
        color="primary"
        iconType="flask"
      />
    );
  }

  if (occurrencesFetch.value === undefined) {
    return null;
  }

  if (occurrencesFetch.value.total_occurrences === 0) {
    return (
      <EuiCallOut
        announceOnMount={false}
        title={i18n.translate('xpack.streams.significantEventsSummary.noOccurrencesTitle', {
          defaultMessage: 'No Significant events detected yet',
        })}
        color="primary"
        iconType="flask"
      />
    );
  }

  const streamLinks = Object.entries(occurrencesFetch.value.by_stream).map(
    ([streamName, count]) => ({
      label: i18n.translate(
        'xpack.streams.significantEventsSummary.occurrencesFoundPerStreamLabel',
        {
          defaultMessage:
            '{streamName} ({occurrences, plural, one {# event} other {# events}} from {queries, plural, one {# query} other {# queries}})',
          values: {
            streamName,
            occurrences: count.occurrences,
            queries: count.queries,
          },
        }
      ),
      href: router.link('/{key}/management/{tab}', {
        path: {
          key: streamName,
          tab: 'significantEvents',
        },
      }),
    })
  );

  return (
    <EuiCallOut
      announceOnMount={false}
      title={
        <EuiFlexGroup
          css={{ display: 'inline-flex', width: '97%' }}
          alignItems="center"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem>
            {i18n.translate('xpack.streams.significantEventsSummary.occurrencesFoundTitle', {
              defaultMessage: 'We found some Significant events in your Streams',
            })}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ConnectorListButton
              buttonProps={{
                fill: true,
                size: 'm',
                iconType: 'sparkles',
                children: i18n.translate(
                  'xpack.streams.significantEventsSummary.generateSummaryButtonLabel',
                  {
                    defaultMessage: 'Generate summary',
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
      }
      color="primary"
      iconType="flask"
    >
      <EuiAccordion
        id="significant_events_summary_stream_breakdown"
        buttonContent={i18n.translate(
          'xpack.streams.significantEventsSummary.occurrencesBreakdownToggleLabel',
          {
            defaultMessage:
              '{total_occurrences, plural, one {# event} other {# events}} found across {total_streams, plural, one {# stream} other {# streams}} using {total_queries, plural, one {# query} other {# queries}}',
            values: {
              total_occurrences: occurrencesFetch.value.total_occurrences,
              total_streams: occurrencesFetch.value.total_streams,
              total_queries: occurrencesFetch.value.total_queries,
            },
          }
        )}
      >
        <EuiListGroup
          listItems={streamLinks}
          color="primary"
          gutterSize="none"
          data-test-subj="significant_events_summary_stream_links"
        />
      </EuiAccordion>

      {summary && (
        <>
          <EuiSpacer size="m" />
          <EuiAccordion
            id="significant_events_summary_summary"
            initialIsOpen={true}
            buttonContent={i18n.translate(
              'xpack.streams.significantEventsSummary.aiSummaryToggleLabel',
              {
                defaultMessage: 'AI summary',
              }
            )}
          >
            <EuiSpacer size="m" />
            <EuiMarkdownFormat>{summary}</EuiMarkdownFormat>
            <EuiSpacer size="m" />
            <FeedbackButtons />
          </EuiAccordion>
        </>
      )}
    </EuiCallOut>
  );
}
