/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiI18nNumber,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useFetchDiscoveryQueries } from '../../hooks/use_fetch_discovery_queries';
import { useStreamFeatures } from '../../hooks/use_stream_features';
import { useStreamOnboardingStatus } from '../../hooks/use_stream_onboarding_status';
import { useSignificantEventsAppRouter } from '../../hooks/use_significant_events_app_router';

const ACTIVE_DRAFT_STATUS = ['active', 'draft'] as const;

interface KnowledgeIndicatorsPanelProps {
  streamName: string;
}

interface KnowledgeIndicatorCountProps {
  count: number | undefined;
  isLoading: boolean;
  isFetching?: boolean;
  isError: boolean;
  label: string;
  'data-test-subj'?: string;
}

function KnowledgeIndicatorCount({
  count,
  isLoading,
  isFetching = false,
  isError,
  label,
  'data-test-subj': dataTestSubj,
}: KnowledgeIndicatorCountProps) {
  const showSpinner = isLoading && (count === undefined || isFetching);
  const showUnavailable = count === undefined && (isError || (!isLoading && !isFetching));

  return (
    <EuiFlexItem grow={false} data-test-subj={dataTestSubj}>
      <EuiFlexGroup alignItems="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <span>
              {showSpinner ? (
                <EuiLoadingSpinner size="m" data-test-subj="knowledgeIndicatorsCountLoading" />
              ) : showUnavailable ? (
                <span data-test-subj="knowledgeIndicatorsCountUnavailable">—</span>
              ) : (
                <EuiI18nNumber value={count ?? 0} />
              )}
            </span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="s"
            color="subdued"
            css={css`
              margin-bottom: 2px;
            `}
          >
            <p>{label}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

export function KnowledgeIndicatorsPanel({ streamName }: KnowledgeIndicatorsPanelProps) {
  const router = useSignificantEventsAppRouter();
  const streamOnboardingResult = useStreamOnboardingStatus(streamName);

  const {
    features,
    featuresLoading,
    error: featuresError,
  } = useStreamFeatures(streamName, [streamOnboardingResult]);
  const queriesFetchState = useFetchDiscoveryQueries(
    {
      name: streamName,
      query: '',
      page: 1,
      perPage: 1,
      status: [...ACTIVE_DRAFT_STATUS],
    },
    [streamOnboardingResult]
  );
  const queriesCount = queriesFetchState.data?.total;
  const queriesLoading = queriesFetchState.isLoading;
  const queriesFetching = queriesFetchState.isFetching;
  const queriesError = queriesFetchState.isError;

  const featuresCount = features.length;
  const featuresIsLoading = featuresLoading;
  const queriesIsLoading = queriesLoading || queriesFetching;

  const href = router.link('/{tab}', {
    path: { tab: 'knowledge_indicators' },
    query: { stream: streamName },
  });

  const featuresLabel = i18n.translate(
    'xpack.significantEventsApp.knowledgeIndicatorsPanel.featuresLabel',
    {
      defaultMessage: '{count, plural, one {feature} other {features}}',
      values: { count: featuresCount },
    }
  );
  const queriesLabel = i18n.translate(
    'xpack.significantEventsApp.knowledgeIndicatorsPanel.queriesLabel',
    {
      defaultMessage: '{count, plural, one {query} other {queries}}',
      values: { count: queriesCount ?? 0 },
    }
  );

  const viewAllAriaLabel =
    featuresIsLoading || queriesIsLoading
      ? i18n.translate('xpack.significantEventsApp.knowledgeIndicatorsPanel.linkAriaLabelLoading', {
          defaultMessage: 'View all knowledge indicators for {streamName}: loading counts',
          values: { streamName },
        })
      : i18n.translate('xpack.significantEventsApp.knowledgeIndicatorsPanel.linkAriaLabel', {
          defaultMessage:
            'View all knowledge indicators for {streamName}: {featuresCount, plural, one {# feature} other {# features}}, {queriesCount, plural, one {# query} other {# queries}}',
          values: { streamName, featuresCount, queriesCount: queriesCount ?? 0 },
        });

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj="significantEventsAppKnowledgeIndicatorsPanel"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.significantEventsApp.knowledgeIndicatorsPanel.title', {
                defaultMessage: 'Knowledge indicators',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiLink
            href={href}
            data-test-subj="significantEventsAppKnowledgeIndicatorsPanelLink"
            aria-label={viewAllAriaLabel}
          >
            {i18n.translate('xpack.significantEventsApp.knowledgeIndicatorsPanel.viewAll', {
              defaultMessage: 'View all',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="l" responsive={false}>
        <KnowledgeIndicatorCount
          count={featuresError || featuresIsLoading ? undefined : featuresCount}
          isLoading={featuresIsLoading}
          isError={!!featuresError}
          label={featuresLabel}
          data-test-subj="significantEventsAppKnowledgeIndicatorsFeaturesCount"
        />
        <KnowledgeIndicatorCount
          count={queriesError || queriesCount === undefined ? undefined : queriesCount}
          isLoading={queriesIsLoading}
          isFetching={queriesFetching}
          isError={queriesError}
          label={queriesLabel}
          data-test-subj="significantEventsAppKnowledgeIndicatorsQueriesCount"
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
