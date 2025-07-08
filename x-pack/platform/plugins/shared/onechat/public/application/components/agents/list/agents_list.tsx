/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBasicTable, EuiBasicTableColumn, EuiFlexGroup, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AgentProfile } from '@kbn/onechat-common';
import { useOnechatAgents } from '../../../hooks/agents/use_agents';
import { appPaths } from '../../../utils/app_paths';
import { useNavigation } from '../../../hooks/use_navigation';

export const AgentsList: React.FC = () => {
  const { agentProfiles, isLoading, error } = useOnechatAgents();

  const { createOnechatUrl } = useNavigation();

  const columns: Array<EuiBasicTableColumn<AgentProfile>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.onechat.agents.nameLabel', { defaultMessage: 'Name' }),
        valign: 'top',
        render: (name: string, item: AgentProfile) => (
          <EuiLink href={createOnechatUrl(appPaths.agents.edit({ agentId: item.id }))}>
            {name}
          </EuiLink>
        ),
      },
      {
        field: 'description',
        name: i18n.translate('xpack.onechat.agents.descriptionLabel', {
          defaultMessage: 'Description',
        }),
        valign: 'top',
        render: (description: string) => <EuiText size="s">{description}</EuiText>,
      },
      {
        field: 'customInstructions',
        name: i18n.translate('xpack.onechat.agents.customInstructionsLabel', {
          defaultMessage: 'Custom Instructions',
        }),
        valign: 'top',
        render: (customInstructions: string) => <EuiText size="s">{customInstructions}</EuiText>,
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

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiBasicTable
        loading={isLoading}
        columns={columns}
        items={agentProfiles}
        itemId="id"
        error={errorMessage}
      />
    </EuiFlexGroup>
  );
};
