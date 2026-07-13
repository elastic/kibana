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
import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import { useFetchDiscoveryQueries } from '../../hooks/significant_events/use_fetch_discovery_queries';
import { useStreamFeatures } from '../../hooks/significant_events/use_stream_features';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

const QUERIES_PER_PAGE = 1000;
const ACTIVE_DRAFT_STATUS = ['active', 'draft'] as const;

interface KnowledgeIndicatorsPanelProps {
  definition: Streams.all.GetResponse;
}

interface KnowledgeIndicatorCountProps {
  count: number;
  isLoading: boolean;
  label: string;
  'data-test-subj'?: string;
}

function KnowledgeIndicatorCount({
  count,
  isLoading,
  label,
  'data-test-subj': dataTestSubj,
}: KnowledgeIndicatorCountProps) {
  return (
    <EuiFlexItem grow={false} data-test-subj={dataTestSubj}>
      <EuiFlexGroup alignItems="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <span>
              {isLoading ? (
                <EuiLoadingSpinner size="m" data-test-subj="knowledgeIndicatorsCountLoading" />
              ) : (
                <EuiI18nNumber value={count} />
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

export function KnowledgeIndicatorsPanel({ definition }: KnowledgeIndicatorsPanelProps) {
  const router = useStreamsAppRouter();
  const streamName = definition.stream.name;

  const { features, featuresLoading } = useStreamFeatures(definition.stream);
  const queriesFetchState = useFetchDiscoveryQueries({
    name: streamName,
    query: '',
    page: 1,
    perPage: QUERIES_PER_PAGE,
    status: [...ACTIVE_DRAFT_STATUS],
  });

  const queriesCount = queriesFetchState.data?.total ?? queriesFetchState.data?.queries.length ?? 0;
  const featuresCount = features.length;
  const isLoading = featuresLoading || queriesFetchState.isLoading;

  const href = router.link('/_discovery/{tab}', {
    path: { tab: 'knowledge_indicators' },
    query: { stream: streamName },
  });

  const featuresLabel = i18n.translate(
    'xpack.streams.streamOverview.knowledgeIndicatorsPanel.featuresLabel',
    {
      defaultMessage: '{count, plural, one {feature} other {features}}',
      values: { count: featuresCount },
    }
  );
  const queriesLabel = i18n.translate(
    'xpack.streams.streamOverview.knowledgeIndicatorsPanel.queriesLabel',
    {
      defaultMessage: '{count, plural, one {query} other {queries}}',
      values: { count: queriesCount },
    }
  );

  return (
    <EuiLink
      href={href}
      data-test-subj="streamsAppKnowledgeIndicatorsPanelLink"
      aria-label={i18n.translate(
        'xpack.streams.streamOverview.knowledgeIndicatorsPanel.linkAriaLabel',
        {
          defaultMessage:
            'View knowledge indicators for {streamName}: {featuresCount, plural, one {# feature} other {# features}}, {queriesCount, plural, one {# query} other {# queries}}',
          values: { streamName, featuresCount, queriesCount },
        }
      )}
      css={css`
        text-decoration: none;

        &:hover,
        &:focus {
          text-decoration: none;
        }
      `}
    >
      <EuiPanel hasBorder hasShadow={false} paddingSize="m">
        <EuiTitle size="xs">
          <h2>
            {i18n.translate('xpack.streams.streamOverview.knowledgeIndicatorsPanel.title', {
              defaultMessage: 'Knowledge indicators',
            })}
          </h2>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiFlexGroup gutterSize="l" responsive={false}>
          <KnowledgeIndicatorCount
            count={featuresCount}
            isLoading={isLoading}
            label={featuresLabel}
            data-test-subj="streamsAppKnowledgeIndicatorsFeaturesCount"
          />
          <KnowledgeIndicatorCount
            count={queriesCount}
            isLoading={isLoading}
            label={queriesLabel}
            data-test-subj="streamsAppKnowledgeIndicatorsQueriesCount"
          />
        </EuiFlexGroup>
      </EuiPanel>
    </EuiLink>
  );
}
