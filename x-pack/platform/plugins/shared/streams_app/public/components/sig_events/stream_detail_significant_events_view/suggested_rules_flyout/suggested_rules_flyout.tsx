/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import React, { useCallback, useState } from 'react';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
import {
  DISCOVERY_QUERIES_QUERY_KEY,
  type SignificantEventQueryRow,
} from '../../../../hooks/sig_events/use_fetch_discovery_queries';
import { UNBACKED_QUERIES_COUNT_QUERY_KEY } from '../../../../hooks/sig_events/use_unbacked_queries_count';
import { usePromotableQueries } from '../../../../hooks/sig_events/use_promotable_queries';
import { useQueriesApi } from '../../../../hooks/sig_events/use_queries_api';
import { getFormattedError } from '../../../../util/errors';
import { useKibana } from '../../../../hooks/use_kibana';
import { SeverityBadge } from '../../significant_events_discovery/components/severity_badge/severity_badge';

interface SuggestedRulesFlyoutProps {
  streamName: string;
  onClose: () => void;
}

export function SuggestedRulesFlyout({ streamName, onClose }: SuggestedRulesFlyoutProps) {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'suggestedRulesFlyout' });
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  const { count, queries, queryIds, refetch, isLoading } = usePromotableQueries(streamName);

  const [pagination, setPagination] = useState({ index: 0, size: 20 });

  const onTableChange = useCallback(
    ({ page }: CriteriaWithPagination<SignificantEventQueryRow>) => {
      if (!page) return;
      setPagination(page);
    },
    []
  );

  const pageOfQueries = queries.slice(
    pagination.index * pagination.size,
    (pagination.index + 1) * pagination.size
  );
  const { promote, removeQuery } = useQueriesApi();

  const invalidateQueriesData = async () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: UNBACKED_QUERIES_COUNT_QUERY_KEY }),
    ]);

  const createRulesMutation = useMutation<{ promoted: number }, Error>({
    mutationFn: () => promote({ queryIds }),
    onSuccess: async ({ promoted }) => {
      toasts.addSuccess(
        i18n.translate('xpack.streams.suggestedRulesFlyout.createRulesSuccess', {
          defaultMessage: '{count, plural, one {# rule} other {# rules}} created successfully.',
          values: { count: promoted },
        })
      );
      await invalidateQueriesData();
      onClose();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.streams.suggestedRulesFlyout.createRulesError', {
          defaultMessage: 'Failed to create rules',
        }),
      });
    },
  });

  const deleteQueryMutation = useMutation<void, Error, SignificantEventQueryRow>({
    mutationFn: (item) => removeQuery({ queryId: item.query.id, streamName: item.stream_name }),
    onSuccess: async () => {
      await invalidateQueriesData();
      refetch();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.streams.suggestedRulesFlyout.deleteQueryError', {
          defaultMessage: 'Failed to delete query',
        }),
      });
    },
  });

  const columns: Array<EuiBasicTableColumn<SignificantEventQueryRow>> = [
    {
      field: 'expand',
      name: '',
      width: '40px',
      render: () => (
        <EuiButtonIcon
          iconType="expand"
          aria-label={i18n.translate('xpack.streams.suggestedRulesFlyout.expandAriaLabel', {
            defaultMessage: 'Expand row',
          })}
          isDisabled
        />
      ),
    },
    {
      field: 'query.title',
      name: i18n.translate('xpack.streams.suggestedRulesFlyout.rulesColumn', {
        defaultMessage: 'Rules',
      }),
      truncateText: true,
      render: (_: unknown, item: SignificantEventQueryRow) => (
        <EuiText size="s">
          <strong>{item.query.title}</strong>
        </EuiText>
      ),
    },
    {
      field: 'query.severity_score',
      name: i18n.translate('xpack.streams.suggestedRulesFlyout.severityColumn', {
        defaultMessage: 'Severity',
      }),
      width: '120px',
      render: (_: unknown, item: SignificantEventQueryRow) => (
        <SeverityBadge score={item.query.severity_score} />
      ),
    },
    {
      name: '',
      width: '40px',
      actions: [
        {
          name: i18n.translate('xpack.streams.suggestedRulesFlyout.deleteAction', {
            defaultMessage: 'Delete',
          }),
          description: i18n.translate(
            'xpack.streams.suggestedRulesFlyout.deleteActionDescription',
            { defaultMessage: 'Remove this suggested rule' }
          ),
          icon: 'trash',
          type: 'icon',
          color: 'danger',
          onClick: (item: SignificantEventQueryRow) => deleteQueryMutation.mutate(item),
          'data-test-subj': 'suggestedRulesFlyoutDeleteButton',
        },
      ],
    },
  ];

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      type="overlay"
      ownFocus={false}
      size="m"
      data-test-subj="streamsAppSuggestedRulesFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>
                {i18n.translate('xpack.streams.suggestedRulesFlyout.title', {
                  defaultMessage: 'Suggested rules',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('xpack.streams.suggestedRulesFlyout.description', {
                  defaultMessage:
                    'We generate rules based on the queries that are of critical importance for this stream. You can review and discard results.',
                })}
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.streams.suggestedRulesFlyout.showing', {
                defaultMessage: 'Showing {count, plural, one {# Rule} other {# Rules}}',
                values: { count },
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiBasicTable
              tableCaption={i18n.translate('xpack.streams.suggestedRulesFlyout.tableCaption', {
                defaultMessage: 'Suggested rules',
              })}
              columns={columns}
              itemId={(item) => item.query.id}
              items={pageOfQueries}
              loading={isLoading || deleteQueryMutation.isLoading}
              noItemsMessage={
                !isLoading
                  ? i18n.translate('xpack.streams.suggestedRulesFlyout.noItems', {
                      defaultMessage: 'No suggested rules found.',
                    })
                  : ''
              }
              pagination={{
                pageIndex: pagination.index,
                pageSize: pagination.size,
                totalItemCount: count,
                pageSizeOptions: [...PAGE_SIZE_OPTIONS],
              }}
              onChange={onTableChange}
              data-test-subj="suggestedRulesTable"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              disabled={createRulesMutation.isLoading}
              data-test-subj="suggestedRulesFlyoutCancelButton"
            >
              {i18n.translate('xpack.streams.suggestedRulesFlyout.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="primary"
              onClick={() => createRulesMutation.mutate()}
              isLoading={createRulesMutation.isLoading}
              isDisabled={queryIds.length === 0}
              data-test-subj="suggestedRulesFlyoutCreateButton"
            >
              {i18n.translate('xpack.streams.suggestedRulesFlyout.createRulesButton', {
                defaultMessage: 'Create rules',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
