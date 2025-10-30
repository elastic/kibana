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
import { type AgentDefinition } from '@kbn/onechat-common';
import { countBy } from 'lodash';
import React, { useMemo } from 'react';
import { useDeleteAgent } from '../../../context/delete_agent_context';
import { useOnechatAgents } from '../../../hooks/agents/use_agents';
import { useNavigation } from '../../../hooks/use_navigation';
import { searchParamNames } from '../../../search_param_names';
import { appPaths } from '../../../utils/app_paths';
import { FilterOptionWithMatchesBadge } from '../../common/filter_option_with_matches_badge';
import { Labels } from '../../common/labels';
import { AgentAvatar } from '../agent_avatar';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';

const columnNames = {
  name: i18n.translate('xpack.onechat.agents.nameColumn', { defaultMessage: 'Name' }),
  labels: i18n.translate('xpack.onechat.agents.labelsColumn', { defaultMessage: 'Labels' }),
};

const actionLabels = {
  chat: i18n.translate('xpack.onechat.agents.actions.chat', { defaultMessage: 'Chat' }),
  chatDescription: i18n.translate('xpack.onechat.agents.actions.chatDescription', {
    defaultMessage: 'Chat with agent',
  }),
  edit: i18n.translate('xpack.onechat.agents.actions.edit', { defaultMessage: 'Edit' }),
  editDescription: i18n.translate('xpack.onechat.agents.actions.editDescription', {
    defaultMessage: 'Edit agent',
  }),
  clone: i18n.translate('xpack.onechat.agents.actions.clone', { defaultMessage: 'Clone' }),
  cloneDescription: i18n.translate('xpack.onechat.agents.actions.cloneDescription', {
    defaultMessage: 'Clone agent',
  }),
  delete: i18n.translate('xpack.onechat.agents.actions.delete', { defaultMessage: 'Delete' }),
  deleteDescription: i18n.translate('xpack.onechat.agents.actions.deleteDescription', {
    defaultMessage: 'Delete agent',
  }),
};

export const AgentsList: React.FC = () => {
  const { agents, isLoading, error } = useOnechatAgents();
  const { manageAgents } = useUiPrivileges();
  const { createOnechatUrl } = useNavigation();
  const { deleteAgent } = useDeleteAgent();

  const columns: Array<EuiBasicTableColumn<AgentDefinition>> = useMemo(() => {
    const agentAvatar: EuiTableComputedColumnType<AgentDefinition> = {
      width: '48px',
      align: 'center',
      render: (agent) =>
        agent.readonly && !agent.avatar_symbol ? (
          <EuiIcon type={agent.avatar_icon ?? 'logoElastic'} size="xl" />
        ) : (
          <AgentAvatar agent={agent} size="m" />
        ),
    };

    const agentNameAndDescription: EuiTableFieldDataColumnType<AgentDefinition> = {
      field: 'name',
      name: columnNames.name,
      render: (name: string, agent: AgentDefinition) => (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem grow={false}>
            {agent.readonly ? (
              <EuiText size="s">{name}</EuiText>
            ) : (
              <EuiLink href={createOnechatUrl(appPaths.agents.edit({ agentId: agent.id }))}>
                {name}
              </EuiLink>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{agent.description}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
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
    };

    const agentActions: EuiTableActionsColumnType<AgentDefinition> = {
      actions: [
        {
          type: 'icon',
          icon: 'comment',
          name: actionLabels.chat,
          description: actionLabels.chatDescription,
          isPrimary: true,
          showOnHover: true,
          href: (agent) =>
            createOnechatUrl(appPaths.chat.new, { [searchParamNames.agentId]: agent.id }),
        },
        {
          type: 'icon',
          icon: 'pencil',
          name: actionLabels.edit,
          description: actionLabels.editDescription,
          isPrimary: true,
          showOnHover: true,
          href: (agent) => createOnechatUrl(appPaths.agents.edit({ agentId: agent.id })),
          available: (agent) => !agent.readonly && manageAgents,
        },
        {
          type: 'icon',
          icon: 'copy',
          name: actionLabels.clone,
          description: actionLabels.cloneDescription,
          showOnHover: true,
          href: (agent) =>
            createOnechatUrl(appPaths.agents.new, { [searchParamNames.sourceId]: agent.id }),
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
  }, [createOnechatUrl, deleteAgent, manageAgents]);

  const errorMessage = useMemo(
    () =>
      error
        ? i18n.translate('xpack.onechat.agents.listErrorMessage', {
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
      loading={isLoading}
      error={errorMessage}
      responsiveBreakpoint={false}
    />
  );
};
