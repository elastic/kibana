/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiCallOut,
  EuiSuperDatePicker,
  useEuiTheme,
  EuiLink,
  EuiAvatar,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn, OnTimeChangeProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import moment from 'moment';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { ConversationSummary } from '../../../../common/http_api/conversations';
import { useNavigation } from '../../hooks/use_navigation';
import { useMonitoringListConversations } from '../../hooks/monitoring';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import { TechPreviewTitle } from '../common/tech_preview';

export const MonitoringList: React.FC = () => {
  const { createOnechatUrl } = useNavigation();
  const { euiTheme } = useEuiTheme();

  const [start, setStart] = useState<string>('now-7d');
  const [end, setEnd] = useState<string>('now');
  const [userFilter, setUserFilter] = useState<string>('');

  const onTimeChange = ({ start: newStart, end: newEnd }: OnTimeChangeProps) => {
    setStart(newStart);
    setEnd(newEnd);
  };

  // Parse dateMath expressions to absolute dates
  const parseDate = (dateString: string): string => {
    // Handle 'now' and relative dates like 'now-7d', 'now-30d', etc.
    if (dateString === 'now') {
      return moment().toISOString();
    }
    if (dateString.startsWith('now-')) {
      const match = dateString.match(/now-(\d+)([smhdwMy])/);
      if (match) {
        const [, amount, unit] = match;
        return moment()
          .subtract(parseInt(amount, 10), unit as moment.unitOfTime.DurationConstructor)
          .toISOString();
      }
    }
    if (dateString.startsWith('now+')) {
      const match = dateString.match(/now\+(\d+)([smhdwMy])/);
      if (match) {
        const [, amount, unit] = match;
        return moment()
          .add(parseInt(amount, 10), unit as moment.unitOfTime.DurationConstructor)
          .toISOString();
      }
    }
    // Absolute date
    return moment(dateString).toISOString();
  };

  const queryParams = useMemo(
    () => ({
      start: parseDate(start),
      end: parseDate(end),
      user: userFilter || undefined,
    }),
    [start, end, userFilter]
  );

  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch: refetchQuery,
  } = useMonitoringListConversations(queryParams);

  const error = queryError ? labels.monitoring.loadErrorMessage : null;

  const handleRefresh = () => {
    refetchQuery();
  };

  const columns: Array<EuiBasicTableColumn<ConversationSummary>> = [
    {
      field: 'id',
      name: labels.monitoring.conversationLabel,
      truncateText: true,
      render: (id: string, item: ConversationSummary) => (
        <EuiLink
          href={createOnechatUrl(appPaths.monitoring.detail({ conversationId: item.id }))}
          data-test-subj="monitoringConversationLink"
        >
          {item.title || id}
        </EuiLink>
      ),
    },
    {
      field: 'created_at',
      name: labels.monitoring.createdAtLabel,
      dataType: 'date',
      render: (createdAt: string) => {
        const date = moment(createdAt).toDate();
        return (
          <EuiToolTip content={moment(createdAt).format('MMMM D, YYYY @ HH:mm:ss.SSS')}>
            <span>
              <FormattedRelative value={date} />
            </span>
          </EuiToolTip>
        );
      },
    },
    {
      field: 'user.username',
      name: labels.monitoring.authorLabel,
      render: (_: any, item: ConversationSummary) => {
        const username = item.user.username || item.user.id;
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiAvatar name={username} size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{username}</EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'tokens_in',
      name: labels.monitoring.tokensInLabel,
      dataType: 'number',
      render: (tokensIn: number) => tokensIn.toLocaleString(),
    },
    {
      field: 'tokens_out',
      name: labels.monitoring.tokensOutLabel,
      dataType: 'number',
      render: (tokensOut: number) => tokensOut.toLocaleString(),
    },
    {
      field: 'rounds_count',
      name: labels.monitoring.roundsLabel,
      dataType: 'number',
      render: (roundsCount: number) => roundsCount.toLocaleString(),
    },
  ];

  const headerStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
    border-block-end: none;
  `;

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderMonitoringPage">
      <KibanaPageTemplate.Header
        css={headerStyles}
        pageTitle={<TechPreviewTitle title={labels.monitoring.title} />}
        description={
          <FormattedMessage
            id="xpack.onechat.monitoring.description"
            defaultMessage="Monitor conversations, track token usage, and analyze tool calls."
          />
        }
      />
      <KibanaPageTemplate.Section>
        {/* Filters */}
        <EuiPanel paddingSize="l" hasShadow={false} hasBorder>
          <EuiFlexGroup alignItems="flexEnd" gutterSize="m">
            <EuiFlexItem grow={2}>
              <EuiSuperDatePicker
                start={start}
                end={end}
                onTimeChange={onTimeChange}
                onRefresh={handleRefresh}
                showUpdateButton={false}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiFormRow label={labels.monitoring.userFilterLabel} fullWidth>
                <EuiFieldText
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  placeholder={i18n.translate('xpack.onechat.monitoring.userFilterPlaceholder', {
                    defaultMessage: 'Filter by username',
                  })}
                  fullWidth
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={handleRefresh} isLoading={loading} fill iconType="refresh">
                {i18n.translate('xpack.onechat.monitoring.applyFiltersButton', {
                  defaultMessage: 'Apply filters',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer size="l" />

        {/* Aggregate Stats */}
        {data && (
          <>
            <EuiFlexGroup gutterSize="l">
              <EuiFlexItem>
                <EuiPanel hasBorder>
                  <EuiStat
                    title={data.aggregates.total_tokens_in.toLocaleString()}
                    description={labels.monitoring.totalTokensIn}
                    titleSize="m"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasBorder>
                  <EuiStat
                    title={data.aggregates.total_tokens_out.toLocaleString()}
                    description={labels.monitoring.totalTokensOut}
                    titleSize="m"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasBorder>
                  <EuiStat
                    title={data.aggregates.total_messages.toLocaleString()}
                    description={labels.monitoring.totalMessages}
                    titleSize="m"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasBorder>
                  <EuiStat
                    title={data.aggregates.total_tool_calls.toLocaleString()}
                    description={labels.monitoring.totalToolCalls}
                    titleSize="m"
                  />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="l" />
          </>
        )}

        {/* Error Message */}
        {error && (
          <>
            <EuiCallOut title={error} color="danger" iconType="error" />
            <EuiSpacer size="l" />
          </>
        )}

        {/* Conversations Table */}
        <EuiBasicTable
          items={data?.conversations || []}
          columns={columns}
          loading={loading}
          tableLayout="auto"
        />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
