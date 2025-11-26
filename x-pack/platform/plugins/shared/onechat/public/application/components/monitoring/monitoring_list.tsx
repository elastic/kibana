/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiBasicTable,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiCallOut,
  EuiSuperDatePicker,
  useEuiTheme,
  EuiLink,
  EuiAvatar,
  EuiToolTip,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';
import type {
  EuiBasicTableColumn,
  OnTimeChangeProps,
  EuiComboBoxOptionOption,
  CriteriaWithPagination,
} from '@elastic/eui';
import { css } from '@emotion/react';
import dateMath from '@kbn/datemath';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import moment from 'moment';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { ConversationSummary } from '../../../../common/http_api/conversations';
import { useNavigation } from '../../hooks/use_navigation';
import { useMonitoringListConversations } from '../../hooks/monitoring';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import { TechPreviewTitle } from '../common/tech_preview';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const MonitoringList: React.FC = () => {
  const { createOnechatUrl } = useNavigation();
  const { euiTheme } = useEuiTheme();

  const [start, setStart] = useState<string>('now-7d');
  const [end, setEnd] = useState<string>('now');
  const [selectedUsers, setSelectedUsers] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const onTimeChange = ({ start: newStart, end: newEnd }: OnTimeChangeProps) => {
    setStart(newStart);
    setEnd(newEnd);
    setPageIndex(0); // Reset to first page when date filter changes
  };

  // Parse dateMath expressions to absolute dates using Kibana's dateMath utility
  const parseDate = (dateString: string, roundUp: boolean = false): string => {
    const parsed = dateMath.parse(dateString, { roundUp });
    return parsed?.toISOString() ?? moment().toISOString();
  };

  // Query params for fetching - only date filtering on backend
  const queryParams = useMemo(
    () => ({
      start: parseDate(start, false),
      end: parseDate(end, true),
    }),
    [start, end]
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

  // Extract unique users from ALL conversations (date-filtered) for the combobox
  const userOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    if (!data?.conversations) return [];
    const uniqueUsers = new Map<string, string>();
    data.conversations.forEach((conv) => {
      const username = conv.user.username || conv.user.id;
      uniqueUsers.set(username, username);
    });
    return Array.from(uniqueUsers.values())
      .sort((a, b) => a.localeCompare(b))
      .map((username) => ({
        label: username,
        value: username,
      }));
  }, [data?.conversations]);

  // Filter conversations by selected user (client-side)
  const filteredConversations = useMemo(() => {
    if (!data?.conversations) return [];
    if (selectedUsers.length === 0) return data.conversations;

    const selectedUsername = selectedUsers[0].value;
    return data.conversations.filter((conv) => {
      const username = conv.user.username || conv.user.id;
      return username === selectedUsername;
    });
  }, [data?.conversations, selectedUsers]);

  // Recalculate aggregates based on filtered conversations
  const filteredAggregates = useMemo(() => {
    if (selectedUsers.length === 0 && data?.aggregates) {
      return data.aggregates;
    }

    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let totalMessages = 0;
    let totalToolCalls = 0;

    filteredConversations.forEach((conv) => {
      totalTokensIn += conv.tokens_in;
      totalTokensOut += conv.tokens_out;
      totalMessages += conv.rounds_count;
      totalToolCalls += conv.tool_calls_count;
    });

    return {
      total_tokens_in: totalTokensIn,
      total_tokens_out: totalTokensOut,
      total_messages: totalMessages,
      total_tool_calls: totalToolCalls,
    };
  }, [data?.aggregates, filteredConversations, selectedUsers.length]);

  // Pagination logic
  const totalItemCount = filteredConversations.length;
  const startIndex = pageIndex * pageSize;
  const paginatedConversations = useMemo(() => {
    return filteredConversations.slice(startIndex, startIndex + pageSize);
  }, [filteredConversations, startIndex, pageSize]);

  const onTableChange = useCallback(({ page }: CriteriaWithPagination<ConversationSummary>) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  }, []);

  // Reset to first page when filters change
  const handleUserFilterChange = useCallback((options: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedUsers(options);
    setPageIndex(0);
  }, []);

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    }),
    [pageIndex, pageSize, totalItemCount]
  );

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
            <span tabIndex={0}>
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
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiSuperDatePicker
              start={start}
              end={end}
              onTimeChange={onTimeChange}
              onRefresh={handleRefresh}
              showUpdateButton
              isLoading={loading}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ minWidth: 250 }}>
            <EuiComboBox
              aria-label={labels.monitoring.userFilterLabel}
              prepend={labels.monitoring.authorLabel}
              placeholder={labels.monitoring.userFilterLabel}
              singleSelection={{ asPlainText: true }}
              options={userOptions}
              selectedOptions={selectedUsers}
              onChange={handleUserFilterChange}
              isClearable
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        {/* Aggregate Stats */}
        {data && (
          <>
            <EuiFlexGroup gutterSize="l">
              <EuiFlexItem>
                <EuiPanel hasBorder color="subdued">
                  <EuiStat
                    title={filteredAggregates.total_tokens_in.toLocaleString()}
                    description={labels.monitoring.totalTokensIn}
                    titleSize="m"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasBorder color="subdued">
                  <EuiStat
                    title={filteredAggregates.total_tokens_out.toLocaleString()}
                    description={labels.monitoring.totalTokensOut}
                    titleSize="m"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasBorder color="subdued">
                  <EuiStat
                    title={filteredAggregates.total_messages.toLocaleString()}
                    description={labels.monitoring.totalMessages}
                    titleSize="m"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasBorder color="subdued">
                  <EuiStat
                    title={filteredAggregates.total_tool_calls.toLocaleString()}
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
            <EuiCallOut title={error} color="danger" iconType="error" announceOnMount />
            <EuiSpacer size="l" />
          </>
        )}

        {/* Conversations Table */}
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.onechat.monitoring.resultsCount"
            defaultMessage="Showing {start}-{end} of {total} conversations"
            values={{
              start: <strong>{totalItemCount > 0 ? startIndex + 1 : 0}</strong>,
              end: <strong>{Math.min(startIndex + pageSize, totalItemCount)}</strong>,
              total: totalItemCount,
            }}
          />
        </EuiText>
        <EuiSpacer size="s" />
        <EuiHorizontalRule margin="none" style={{ height: 2 }} />
        <EuiBasicTable
          tableCaption={labels.monitoring.title}
          items={paginatedConversations}
          columns={columns}
          loading={loading}
          tableLayout="auto"
          pagination={pagination}
          onChange={onTableChange}
        />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
