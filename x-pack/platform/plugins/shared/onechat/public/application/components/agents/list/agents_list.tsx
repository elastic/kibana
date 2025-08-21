/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiText,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { oneChatDefaultAgentId, type AgentDefinition } from '@kbn/onechat-common';
import { useOnechatAgents } from '../../../hooks/agents/use_agents';
import { appPaths } from '../../../utils/app_paths';
import { useNavigation } from '../../../hooks/use_navigation';

const columnNames = {
  name: i18n.translate('xpack.onechat.agents.nameLabel', { defaultMessage: 'Name' }),
  description: i18n.translate('xpack.onechat.agents.descriptionLabel', {
    defaultMessage: 'Description',
  }),
  labels: i18n.translate('xpack.onechat.agents.labelsLabel', { defaultMessage: 'Labels' }),
};

export const AgentsList: React.FC = () => {
  const { agents, isLoading, error } = useOnechatAgents();

  const { createOnechatUrl } = useNavigation();

  const columns: Array<EuiBasicTableColumn<AgentDefinition>> = useMemo(
    () => [
      // Agent avatar
      {
        width: '48px',
        align: 'center',
        render: (agent: AgentDefinition) =>
          // TODO: Add avatar for custom agents
          agent.id === oneChatDefaultAgentId ? <EuiIcon type="logoElastic" size="xl" /> : null,
      },
      {
        field: 'name',
        name: columnNames.name,
        render: (name: string, item: AgentDefinition) => (
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiLink href={createOnechatUrl(appPaths.agents.edit({ agentId: item.id }))}>
                {name}
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{item.description}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'labels',
        name: columnNames.labels,
        render: (labels?: string[]) => (
          <EuiFlexGroup direction="row" wrap>
            {labels?.map((label) => (
              <EuiFlexItem key={label} grow={false}>
                <EuiBadge>{label}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
      },
    ],
    [createOnechatUrl]
  );

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
    return Array.from(new Set(labels)).map((label) => ({ value: label }));
  }, [agents]);

  return (
    <EuiInMemoryTable
      items={agents}
      itemId={(agent) => agent.id}
      columns={columns}
      sorting={true}
      selection={{ selectable: (agent) => agent.id !== oneChatDefaultAgentId }}
      search={{
        box: { incremental: true },
        filters: [
          {
            type: 'field_value_selection',
            name: 'Labels',
            multiSelect: 'and',
            options: labelOptions,
          },
        ],
      }}
      loading={isLoading}
      error={errorMessage}
      responsiveBreakpoint={false}
    />
  );
};
