/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { LoadingPanel } from '../../../../loading_panel';
import { useStreamsAppRouter } from '../../../../../hooks/use_streams_app_router';
import { useCodeIntelligenceAvailability } from '../../../../../hooks/significant_events/use_code_intelligence_availability';
import {
  useCodeIntelligenceRepositories,
  type CodeIntelligenceRepositoryRow,
} from '../../../../../hooks/significant_events/use_code_intelligence_repositories';
import { CodeIntelligencePlaceholder } from '../../../stream_detail_significant_events_view/code_insights_panel';

export function CodeIntelligenceTab() {
  const router = useStreamsAppRouter();
  const { available, isLoading: isAvailabilityLoading } = useCodeIntelligenceAvailability();
  const { repositories, isLoading: isRepositoriesLoading } = useCodeIntelligenceRepositories({
    enabled: available,
  });

  if (isAvailabilityLoading) {
    return <LoadingPanel size="xxl" />;
  }

  if (!available) {
    return <CodeIntelligencePlaceholder />;
  }

  const columns: Array<EuiBasicTableColumn<CodeIntelligenceRepositoryRow>> = [
    {
      field: 'repository',
      name: REPOSITORY_LABEL,
      render: (repository: string) => <EuiBadge color="hollow">{repository}</EuiBadge>,
      sortable: true,
    },
    {
      field: 'repo_type',
      name: REPO_TYPE_LABEL,
      render: (repoType?: string) =>
        repoType ? (
          <EuiBadge color="hollow" css={{ textTransform: 'capitalize' }}>
            {repoType}
          </EuiBadge>
        ) : (
          EMPTY_VALUE
        ),
    },
    {
      field: 'language',
      name: LANGUAGE_LABEL,
      render: (language?: string) =>
        language ? <EuiBadge color="hollow">{language}</EuiBadge> : EMPTY_VALUE,
    },
    {
      field: 'service_name',
      name: SERVICE_NAME_LABEL,
      render: (serviceName: string | undefined, row: CodeIntelligenceRepositoryRow) =>
        serviceName ? (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color="accent">{serviceName}</EuiBadge>
            </EuiFlexItem>
            {row.service_predicted ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={PREDICTED_TOOLTIP}>
                  <EuiBadge color="warning">{PREDICTED_LABEL}</EuiBadge>
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ) : (
          EMPTY_VALUE
        ),
    },
    {
      field: 'stream_name',
      name: STREAM_LABEL,
      render: (streamName?: string) =>
        streamName ? (
          <EuiLink
            href={router.link('/{key}/management/{tab}', {
              path: { key: streamName, tab: 'significantEvents' },
            })}
          >
            {streamName}
          </EuiLink>
        ) : (
          <EuiText size="s" color="subdued">
            {NOT_ANALYZED_LABEL}
          </EuiText>
        ),
    },
  ];

  return (
    <EuiInMemoryTable<CodeIntelligenceRepositoryRow>
      items={repositories}
      columns={columns}
      itemId="repository"
      loading={isRepositoriesLoading}
      pagination={{ pageSizeOptions: [25, 50, 100] }}
      sorting={{ sort: { field: 'repository', direction: 'asc' } }}
      search={{ box: { incremental: true, placeholder: SEARCH_PLACEHOLDER } }}
      message={isRepositoriesLoading ? undefined : NO_REPOSITORIES_MESSAGE}
    />
  );
}

const EMPTY_VALUE = (
  <EuiText size="s" color="subdued">
    {'—'}
  </EuiText>
);

const REPOSITORY_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.columns.repository', {
  defaultMessage: 'Repository',
});
const REPO_TYPE_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.columns.repoType', {
  defaultMessage: 'Repository type',
});
const LANGUAGE_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.columns.language', {
  defaultMessage: 'Language',
});
const SERVICE_NAME_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.columns.serviceName', {
  defaultMessage: 'Service name',
});
const STREAM_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.columns.stream', {
  defaultMessage: 'Stream',
});
const NOT_ANALYZED_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.notAnalyzed', {
  defaultMessage: 'Not analyzed yet',
});
const PREDICTED_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.predicted', {
  defaultMessage: 'Predicted',
});
const PREDICTED_TOOLTIP = i18n.translate('xpack.streams.codeIntelligenceTab.predictedTooltip', {
  defaultMessage: 'Resolved from code; not yet observed in logs',
});
const SEARCH_PLACEHOLDER = i18n.translate('xpack.streams.codeIntelligenceTab.searchPlaceholder', {
  defaultMessage: 'Search repositories',
});
const NO_REPOSITORIES_MESSAGE = i18n.translate('xpack.streams.codeIntelligenceTab.noRepositories', {
  defaultMessage: 'No indexed repositories found.',
});
