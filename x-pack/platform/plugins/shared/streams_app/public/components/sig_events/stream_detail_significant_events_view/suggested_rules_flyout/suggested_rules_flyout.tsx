/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type CriteriaWithPagination,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiInMemoryTable,
  EuiLink,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import React, { useEffect, useState } from 'react';
import {
  DISCOVERY_QUERIES_QUERY_KEY,
  type SignificantEventQueryRow,
} from '../../../../hooks/sig_events/use_fetch_discovery_queries';
import { UNBACKED_QUERIES_COUNT_QUERY_KEY } from '../../../../hooks/sig_events/use_unbacked_queries_count';
import { usePromotableQueries } from '../../../../hooks/sig_events/use_promotable_queries';
import { useQueriesApi } from '../../../../hooks/sig_events/use_queries_api';
import { getFormattedError } from '../../../../util/errors';
import { useKibana } from '../../../../hooks/use_kibana';
import { KnowledgeIndicatorQueryDetailsContent } from '../knowledge_indicator_details_flyout/knowledge_indicator_query_details_content';
import { SeverityBadge } from '../../significant_events_discovery/components/severity_badge/severity_badge';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

interface SuggestedRulesFlyoutProps {
  streamName: string;
  onClose: () => void;
}

export function SuggestedRulesFlyout({ streamName, onClose }: SuggestedRulesFlyoutProps) {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'suggestedRulesFlyout' });
  const detailsFlyoutTitleId = useGeneratedHtmlId({ prefix: 'suggestedRulesDetailsFlyout' });
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  const { queries, refetch, isLoading } = usePromotableQueries(streamName);
  const queryIds = queries.map(({ query }) => query.id);
  const [selectedQueryRow, setSelectedQueryRow] = useState<SignificantEventQueryRow | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const { promote, removeQuery } = useQueriesApi();

  const toggleDetailsFlyout = (item: SignificantEventQueryRow) => {
    setSelectedQueryRow((previous) => (previous?.query.id === item.query.id ? null : item));
  };

  useEffect(() => {
    /**
     * Ensuring stable pagination when queries get
     * deleted from the table
     */
    setPagination((currentPagination) => {
      const pageCount = Math.ceil(queries.length / currentPagination.pageSize);
      const maxPageIndex = Math.max(pageCount - 1, 0);

      if (currentPagination.pageIndex <= maxPageIndex) {
        return currentPagination;
      }

      return {
        ...currentPagination,
        pageIndex: maxPageIndex,
      };
    });
  }, [queries.length]);

  const invalidateQueriesData = async () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: UNBACKED_QUERIES_COUNT_QUERY_KEY }),
    ]);

  const createRulesMutation = useMutation<{ promoted: number }, Error>({
    mutationFn: () => promote({ queryIds }),
    onSuccess: async ({ promoted }) => {
      toasts.addSuccess(CREATE_RULES_SUCCESS_MESSAGE(promoted));
      await invalidateQueriesData();
      onClose();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), {
        title: CREATE_RULES_ERROR_TITLE,
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
        title: DELETE_QUERY_ERROR_TITLE,
      });
    },
  });

  const columns: Array<EuiBasicTableColumn<SignificantEventQueryRow>> = [
    {
      field: 'expand',
      name: '',
      width: '40px',
      render: (_: unknown, item: SignificantEventQueryRow) => (
        <EuiButtonIcon
          iconType={selectedQueryRow?.query.id === item.query.id ? 'minimize' : 'expand'}
          aria-label={
            selectedQueryRow?.query.id === item.query.id ? MINIMIZE_ARIA_LABEL : EXPAND_ARIA_LABEL
          }
          onClick={() => toggleDetailsFlyout(item)}
          data-test-subj="suggestedRulesFlyoutExpandButton"
        />
      ),
    },
    {
      field: 'query.title',
      name: RULES_COLUMN_LABEL,
      truncateText: true,
      render: (_: unknown, item: SignificantEventQueryRow) => (
        <EuiText size="s">
          <EuiLink
            onClick={() => toggleDetailsFlyout(item)}
            data-test-subj="suggestedRulesFlyoutQueryTitleLink"
          >
            <strong>{item.query.title}</strong>
          </EuiLink>
        </EuiText>
      ),
    },
    {
      field: 'query.severity_score',
      name: SEVERITY_COLUMN_LABEL,
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
          name: DELETE_ACTION_LABEL,
          description: DELETE_ACTION_DESCRIPTION,
          icon: 'trash',
          type: 'icon',
          color: 'danger',
          onClick: (item: SignificantEventQueryRow) => {
            if (selectedQueryRow?.query.id === item.query.id) {
              setSelectedQueryRow(null);
            }
            deleteQueryMutation.mutate(item);
          },
          'data-test-subj': 'suggestedRulesFlyoutDeleteButton',
        },
      ],
    },
  ];

  return (
    <>
      <EuiFlyout
        onClose={onClose}
        aria-labelledby={flyoutTitleId}
        ownFocus={true}
        size="40%"
        session="start"
        data-test-subj="streamsAppSuggestedRulesFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="m">
                <h2 id={flyoutTitleId}>{FLYOUT_TITLE}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <p>{FLYOUT_DESCRIPTION}</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {SHOWING_RULES_LABEL(queries.length)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiInMemoryTable<SignificantEventQueryRow>
                tableCaption={TABLE_CAPTION}
                columns={columns}
                itemId={(item) => item.query.id}
                items={queries}
                loading={isLoading || deleteQueryMutation.isLoading}
                noItemsMessage={!isLoading ? NO_ITEMS_MESSAGE : ''}
                pagination={{
                  pageIndex: pagination.pageIndex,
                  pageSize: pagination.pageSize,
                  pageSizeOptions: [...PAGE_SIZE_OPTIONS],
                }}
                onTableChange={({ page }: CriteriaWithPagination<SignificantEventQueryRow>) => {
                  if (!page) {
                    return;
                  }

                  setPagination({
                    pageIndex: page.index,
                    pageSize: page.size,
                  });
                }}
                data-test-subj="suggestedRulesTable"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>

        {selectedQueryRow ? (
          <EuiFlyout
            onClose={() => setSelectedQueryRow(null)}
            aria-labelledby={detailsFlyoutTitleId}
            ownFocus={false}
            session="inherit"
            data-test-subj="suggestedRulesFlyoutDetailsFlyout"
          >
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="m">
                <h2 id={detailsFlyoutTitleId}>{selectedQueryRow.query.title}</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <KnowledgeIndicatorQueryDetailsContent
                query={selectedQueryRow.query}
                occurrences={selectedQueryRow.occurrences}
              />
            </EuiFlyoutBody>
          </EuiFlyout>
        ) : null}

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={onClose}
                disabled={createRulesMutation.isLoading}
                data-test-subj="suggestedRulesFlyoutCancelButton"
              >
                {CANCEL_BUTTON_LABEL}
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
                {CREATE_RULES_BUTTON_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
}

const CREATE_RULES_SUCCESS_MESSAGE = (count: number) =>
  i18n.translate('xpack.streams.suggestedRulesFlyout.createRulesSuccess', {
    defaultMessage: '{count, plural, one {# rule} other {# rules}} created successfully.',
    values: { count },
  });

const CREATE_RULES_ERROR_TITLE = i18n.translate(
  'xpack.streams.suggestedRulesFlyout.createRulesError',
  {
    defaultMessage: 'Failed to create rules',
  }
);

const DELETE_QUERY_ERROR_TITLE = i18n.translate(
  'xpack.streams.suggestedRulesFlyout.deleteQueryError',
  {
    defaultMessage: 'Failed to delete query',
  }
);

const MINIMIZE_ARIA_LABEL = i18n.translate('xpack.streams.suggestedRulesFlyout.minimizeAriaLabel', {
  defaultMessage: 'Collapse row details',
});

const EXPAND_ARIA_LABEL = i18n.translate('xpack.streams.suggestedRulesFlyout.expandAriaLabel', {
  defaultMessage: 'Expand row details',
});

const RULES_COLUMN_LABEL = i18n.translate('xpack.streams.suggestedRulesFlyout.rulesColumn', {
  defaultMessage: 'Rules',
});

const SEVERITY_COLUMN_LABEL = i18n.translate('xpack.streams.suggestedRulesFlyout.severityColumn', {
  defaultMessage: 'Severity',
});

const DELETE_ACTION_LABEL = i18n.translate('xpack.streams.suggestedRulesFlyout.deleteAction', {
  defaultMessage: 'Delete',
});

const DELETE_ACTION_DESCRIPTION = i18n.translate(
  'xpack.streams.suggestedRulesFlyout.deleteActionDescription',
  {
    defaultMessage: 'Remove this suggested rule',
  }
);

const FLYOUT_TITLE = i18n.translate('xpack.streams.suggestedRulesFlyout.title', {
  defaultMessage: 'Suggested rules',
});

const FLYOUT_DESCRIPTION = i18n.translate('xpack.streams.suggestedRulesFlyout.description', {
  defaultMessage:
    'We generate rules based on the queries that are of critical importance for this stream. You can review and discard results.',
});

const SHOWING_RULES_LABEL = (count: number) =>
  i18n.translate('xpack.streams.suggestedRulesFlyout.showing', {
    defaultMessage: 'Showing {count, plural, one {# Rule} other {# Rules}}',
    values: { count },
  });

const TABLE_CAPTION = i18n.translate('xpack.streams.suggestedRulesFlyout.tableCaption', {
  defaultMessage: 'Suggested rules',
});

const NO_ITEMS_MESSAGE = i18n.translate('xpack.streams.suggestedRulesFlyout.noItems', {
  defaultMessage: 'No suggested rules found.',
});

const CANCEL_BUTTON_LABEL = i18n.translate('xpack.streams.suggestedRulesFlyout.cancelButton', {
  defaultMessage: 'Cancel',
});

const CREATE_RULES_BUTTON_LABEL = i18n.translate(
  'xpack.streams.suggestedRulesFlyout.createRulesButton',
  {
    defaultMessage: 'Create rules',
  }
);
