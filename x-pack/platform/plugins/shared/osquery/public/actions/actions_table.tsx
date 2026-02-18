/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isEmpty, pickBy, map, isNumber } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiCodeBlock,
  formatDate,
  EuiIcon,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSkeletonText,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { QUERY_TIMEOUT } from '../../common/constants';
import { removeMultilines } from '../../common/utils/build_query/remove_multilines';
import { useAllLiveQueries } from './use_all_live_queries';
import type { SearchHit } from '../../common/search_strategy';
import { useRouterNavigate, useKibana } from '../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../common/experimental_features_context';
import { usePacks } from '../packs/use_packs';

const EMPTY_ARRAY: SearchHit[] = [];

interface ActionTableResultsButtonProps {
  actionId: string;
  isHistoryEnabled: boolean;
}

const ActionTableResultsButton: React.FC<ActionTableResultsButtonProps> = ({
  actionId,
  isHistoryEnabled,
}) => {
  const navProps = useRouterNavigate(
    isHistoryEnabled ? `history/${actionId}` : `live_queries/${actionId}`
  );

  const detailsText = i18n.translate(
    'xpack.osquery.liveQueryActions.table.viewDetailsActionButton',
    {
      defaultMessage: 'Details',
    }
  );

  return (
    <EuiToolTip position="top" content={detailsText} disableScreenReaderOutput>
      <EuiButtonIcon iconType="visTable" {...navProps} aria-label={detailsText} />
    </EuiToolTip>
  );
};

ActionTableResultsButton.displayName = 'ActionTableResultsButton';

const ActionsTableComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const isHistoryEnabled = useIsExperimentalFeatureEnabled('queryHistoryRework');
  const { push } = useHistory();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const { data: packsData } = usePacks({});

  const {
    data: actionsData,
    isLoading,
    isFetching,
  } = useAllLiveQueries({
    activePage: pageIndex,
    limit: pageSize,
    kuery: 'user_id: *',
  });

  const onTableChange = useCallback(({ page = {} }: any) => {
    const { index, size } = page;

    setPageIndex(index);
    setPageSize(size);
  }, []);

  const renderQueryColumn = useCallback((_: any, item: any) => {
    if (item._source.pack_name) {
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="package" />
          </EuiFlexItem>
          <EuiFlexItem>{item._source.pack_name}</EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    const query = item._source.queries[0].query;
    const singleLine = removeMultilines(query);
    const content = singleLine.length > 90 ? `${singleLine?.substring(0, 90)}...` : singleLine;

    return (
      <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
        {content}
      </EuiCodeBlock>
    );
  }, []);

  const renderAgentsColumn = useCallback(
    (_: any, item: any) => <>{item.fields.agents?.length ?? 0}</>,
    []
  );

  const renderCreatedByColumn = useCallback(
    (userId: any) => (isArray(userId) ? userId[0] : '-'),
    []
  );

  const renderTimestampColumn = useCallback(
    (_: any, item: any) => <>{formatDate(item.fields['@timestamp'][0])}</>,
    []
  );

  const renderActionsColumn = useCallback(
    (item: any) => (
      <ActionTableResultsButton
        actionId={item.fields.action_id[0]}
        isHistoryEnabled={isHistoryEnabled}
      />
    ),
    [isHistoryEnabled]
  );

  const newQueryPath = isHistoryEnabled ? '/new' : '/live_queries/new';

  const handlePlayClick = useCallback(
    (item: any) => () => {
      const packId = item._source.pack_id;

      if (packId) {
        return push(newQueryPath, {
          form: pickBy(
            {
              packId: item._source.pack_id,
              agentSelection: {
                agents: item._source.agent_ids,
                allAgentsSelected: item._source.agent_all,
                platformsSelected: item._source.agent_platforms,
                policiesSelected: item._source.agent_policy_ids,
              },
            },
            (value) => !isEmpty(value)
          ),
        });
      }

      push(newQueryPath, {
        form: pickBy(
          {
            query: item._source.queries[0].query,
            ecs_mapping: item._source.queries[0].ecs_mapping,
            savedQueryId: item._source.queries[0].saved_query_id,
            timeout: item._source.queries[0].timeout ?? QUERY_TIMEOUT.DEFAULT,
            agentSelection: {
              agents: item._source.agent_ids,
              allAgentsSelected: item._source.agent_all,
              platformsSelected: item._source.agent_platforms,
              policiesSelected: item._source.agent_policy_ids,
            },
          },
          (value) => !isEmpty(value) || isNumber(value)
        ),
      });
    },
    [push, newQueryPath]
  );
  const renderPlayButton = useCallback(
    (item: any, enabled: any) => {
      const playText = i18n.translate('xpack.osquery.liveQueryActions.table.runActionAriaLabel', {
        defaultMessage: 'Run query',
      });

      return (
        <EuiToolTip position="top" content={playText} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="play"
            onClick={handlePlayClick(item)}
            isDisabled={!enabled}
            aria-label={playText}
          />
        </EuiToolTip>
      );
    },
    [handlePlayClick]
  );

  const existingPackIds = useMemo(() => map(packsData?.data ?? [], 'id'), [packsData]);

  const isPlayButtonAvailable = useCallback(
    (item: any) => {
      if (item.fields.pack_id?.length) {
        return (
          existingPackIds.includes(item.fields.pack_id[0]) &&
          permissions.runSavedQueries &&
          permissions.readPacks
        );
      }

      return !!(permissions.runSavedQueries || permissions.writeLiveQueries);
    },
    [permissions, existingPackIds]
  );

  const columns = useMemo(
    () => [
      {
        field: 'query',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.queryColumnTitle', {
          defaultMessage: 'Query',
        }),
        truncateText: true,
        width: '60%',
        render: renderQueryColumn,
      },
      {
        field: 'agents',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.agentsColumnTitle', {
          defaultMessage: 'Agents',
        }),
        width: '100px',
        render: renderAgentsColumn,
      },
      {
        field: 'created_at',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.createdAtColumnTitle', {
          defaultMessage: 'Created at',
        }),
        width: '200px',
        render: renderTimestampColumn,
      },
      {
        field: 'fields.user_id',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.createdByColumnTitle', {
          defaultMessage: 'Run by',
        }),
        width: '200px',
        render: renderCreatedByColumn,
      },
      {
        name: i18n.translate('xpack.osquery.liveQueryActions.table.viewDetailsColumnTitle', {
          defaultMessage: 'View details',
        }),
        ...(isHistoryEnabled ? { width: '120px' } : {}),
        actions: [
          {
            available: isPlayButtonAvailable,
            render: renderPlayButton,
          },
          {
            render: renderActionsColumn,
          },
        ],
      },
    ],
    [
      isHistoryEnabled,
      isPlayButtonAvailable,
      renderActionsColumn,
      renderAgentsColumn,
      renderCreatedByColumn,
      renderPlayButton,
      renderQueryColumn,
      renderTimestampColumn,
    ]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: actionsData?.data?.total ?? 0,
      pageSizeOptions: [20, 50, 100],
    }),
    [actionsData, pageIndex, pageSize]
  );

  const rowProps = useCallback(
    (data: any) => ({
      'data-test-subj': `row-${data._source.action_id}`,
    }),
    []
  );

  if (isLoading) {
    return <EuiSkeletonText lines={10} />;
  }

  return (
    <EuiBasicTable
      items={actionsData?.data?.items ?? EMPTY_ARRAY}
      loading={isFetching && !isLoading}
      // @ts-expect-error update types
      columns={columns}
      pagination={pagination}
      onChange={onTableChange}
      rowProps={rowProps}
      data-test-subj="liveQueryActionsTable"
      tableCaption={i18n.translate('xpack.osquery.liveQueryActions.table.tableCaption', {
        defaultMessage: 'Live query actions',
      })}
    />
  );
};

export const ActionsTable = React.memo(ActionsTableComponent);
ActionsTable.displayName = 'ActionsTable';
