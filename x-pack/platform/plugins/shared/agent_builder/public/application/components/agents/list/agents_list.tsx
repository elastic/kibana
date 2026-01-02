/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiBasicTableColumn,
  EuiTableActionsColumnType,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
  CriteriaWithPagination,
} from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type AgentDefinition } from '@kbn/agent-builder-common';
import { countBy } from 'lodash';
import React, { useMemo } from 'react';
import { useDeleteAgent } from '../../../context/delete_agent_context';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useNavigation } from '../../../hooks/use_navigation';
import { searchParamNames } from '../../../search_param_names';
import { appPaths } from '../../../utils/app_paths';
import { FilterOptionWithMatchesBadge } from '../../common/filter_option_with_matches_badge';
import { Labels } from '../../common/labels';
import { AgentAvatar } from '../../common/agent_avatar';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';

const columnNames = {
  name: i18n.translate('xpack.agentBuilder.agents.nameColumn', { defaultMessage: 'Name' }),
  labels: i18n.translate('xpack.agentBuilder.agents.labelsColumn', { defaultMessage: 'Labels' }),
};

const actionLabels = {
  chat: i18n.translate('xpack.agentBuilder.agents.actions.chat', { defaultMessage: 'Chat' }),
  chatDescription: i18n.translate('xpack.agentBuilder.agents.actions.chatDescription', {
    defaultMessage: 'Chat with agent',
  }),
  edit: i18n.translate('xpack.agentBuilder.agents.actions.edit', { defaultMessage: 'Edit' }),
  editDescription: i18n.translate('xpack.agentBuilder.agents.actions.editDescription', {
    defaultMessage: 'Edit agent',
  }),
  clone: i18n.translate('xpack.agentBuilder.agents.actions.clone', { defaultMessage: 'Clone' }),
  cloneDescription: i18n.translate('xpack.agentBuilder.agents.actions.cloneDescription', {
    defaultMessage: 'Clone agent',
  }),
  delete: i18n.translate('xpack.agentBuilder.agents.actions.delete', { defaultMessage: 'Delete' }),
  deleteDescription: i18n.translate('xpack.agentBuilder.agents.actions.deleteDescription', {
    defaultMessage: 'Delete agent',
  }),
};

export const AgentsList: React.FC = () => {
  const { agents, isLoading, error } = useAgentBuilderAgents();
  const { manageAgents } = useUiPrivileges();
  const { createAgentBuilderUrl } = useNavigation();
  const { deleteAgent } = useDeleteAgent();
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  const columns: Array<EuiBasicTableColumn<AgentDefinition>> = useMemo(() => {
    const agentAvatar: EuiTableComputedColumnType<AgentDefinition> = {
      width: '48px',
      align: 'center',
      render: (agent) => <AgentAvatar agent={agent} size="m" />,
      'data-test-subj': 'agentBuilderAgentsListAvatar',
    };

    const agentNameAndDescription: EuiTableFieldDataColumnType<AgentDefinition> = {
      field: 'name',
      name: columnNames.name,
      render: (name: string, agent: AgentDefinition) => (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem grow={false}>
            {agent.readonly ? (
              <EuiText data-test-subj="agentBuilderAgentsListName" size="s">
                {name}
              </EuiText>
            ) : (
              <EuiLink
                data-test-subj="agentBuilderAgentsListName"
                href={createAgentBuilderUrl(appPaths.agents.edit({ agentId: agent.id }))}
              >
                {name}
              </EuiLink>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{agent.description}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      'data-test-subj': 'agentBuilderAgentsListNameAndDescription',
    };

    const agentLabels: EuiTableFieldDataColumnType<AgentDefinition> = {
      field: 'labels',
      name: columnNames.labels,
      render: (labels?: string[]) => {
        if (!labels) {
          return null;
        }

        return <Labels labels={labels} />;
      },
      'data-test-subj': 'agentBuilderAgentsListLabels',
    };

    const agentActions: EuiTableActionsColumnType<AgentDefinition> = {
      actions: [
        {
          type: 'icon',
          icon: 'comment',
          name: actionLabels.chat,
          description: actionLabels.chatDescription,
          'data-test-subj': (agent) => `agentBuilderAgentsListChat-${agent.id}`,
          isPrimary: true,
          showOnHover: true,
          href: (agent) =>
            createAgentBuilderUrl(appPaths.chat.new, { [searchParamNames.agentId]: agent.id }),
        },
        {
          type: 'icon',
          icon: 'pencil',
          name: actionLabels.edit,
          description: actionLabels.editDescription,
          'data-test-subj': (agent) => `agentBuilderAgentsListEdit-${agent.id}`,
          isPrimary: true,
          showOnHover: true,
          href: (agent) => createAgentBuilderUrl(appPaths.agents.edit({ agentId: agent.id })),
          available: (agent) => !agent.readonly && manageAgents,
        },
        {
          type: 'icon',
          icon: 'copy',
          name: actionLabels.clone,
          description: actionLabels.cloneDescription,
          'data-test-subj': (agent) => `agentBuilderAgentsListClone-${agent.id}`,
          showOnHover: true,
          href: (agent) =>
            createAgentBuilderUrl(appPaths.agents.new, { [searchParamNames.sourceId]: agent.id }),
          available: () => manageAgents,
        },
        {
          // Have to use a custom action to display the danger color
          // Can use default action if this proposal is implemented: https://github.com/elastic/eui/discussions/8735
          render: (agent) => {
            return (
              <EuiToolTip position="right" content={actionLabels.deleteDescription} delay="long">
                <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
                  <EuiIcon type="trash" color="danger" />
                  <EuiLink
                    data-test-subj={`agentBuilderAgentsListDelete-${agent.id}`}
                    onClick={() => {
                      deleteAgent({ agent });
                    }}
                    color="danger"
                  >
                    {actionLabels.delete}
                  </EuiLink>
                </EuiFlexGroup>
              </EuiToolTip>
            );
          },
          available: (agent) => !agent.readonly && manageAgents,
        },
      ],
    };

    return [agentAvatar, agentNameAndDescription, agentLabels, agentActions];
  }, [createAgentBuilderUrl, deleteAgent, manageAgents]);

  const errorMessage = useMemo(
    () =>
      error
        ? i18n.translate('xpack.agentBuilder.agents.listErrorMessage', {
            defaultMessage: 'Failed to fetch agents',
          })
        : undefined,
    [error]
  );

  const labelOptions = useMemo(() => {
    const labels = agents.flatMap((agent) => agent.labels ?? []);
    const matchesByLabel = countBy(labels);
    const uniqueLabels = Object.keys(matchesByLabel);
    return uniqueLabels.map((label) => ({
      value: label,
      view: <FilterOptionWithMatchesBadge name={label} matches={matchesByLabel[label]} />,
    }));
  }, [agents]);

  return (
    <EuiInMemoryTable
      data-test-subj="agentBuilderAgentsListTable"
      rowProps={(row) => ({ 'data-test-subj': `agentBuilderAgentsListRow-${row.id}` })}
      items={agents}
      itemId={(agent) => agent.id}
      columns={columns}
      sorting={true}
      search={{
        box: { incremental: true },
        filters: [
          {
            type: 'field_value_selection',
            name: 'Labels',
            multiSelect: 'and',
            options: labelOptions,
            field: 'labels',
            operator: 'exact',
            autoSortOptions: false,
          },
        ],
      }}
      pagination={{
        pageIndex,
        pageSize,
        pageSizeOptions: [10, 25, 50, 100],
        showPerPageOptions: true,
      }}
      onTableChange={({ page }: CriteriaWithPagination<AgentDefinition>) => {
        if (page) {
          setPageIndex(page.index);
          if (page.size !== pageSize) {
            setPageSize(page.size);
            setPageIndex(0);
          }
        }
      }}
      loading={isLoading}
      error={errorMessage}
      responsiveBreakpoint={false}
    />
  );
};
