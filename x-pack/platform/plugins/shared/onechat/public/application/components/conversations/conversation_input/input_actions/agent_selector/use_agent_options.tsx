/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiHighlight, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import type { AgentDefinition } from '@kbn/onechat-common';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { AgentAvatar } from '../../../../common/agent_avatar';
import { useConversationBorderRadius } from '../../../conversation.styles';

const AgentOptionPrepend: React.FC<{ agent: AgentDefinition }> = ({ agent }) => {
  const { euiTheme } = useEuiTheme();
  const panelStyles = css`
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    ${useConversationBorderRadius('m')}
  `;
  return (
    <EuiPanel css={panelStyles} hasShadow={false}>
      <AgentAvatar size="s" agent={agent} />
    </EuiPanel>
  );
};

type AgentOptionData = EuiSelectableOption<{ agent?: AgentDefinition }>;

interface AgentOptionProps {
  agent?: AgentDefinition;
  searchValue: string;
}

const AgentOption: React.FC<AgentOptionProps> = ({ agent, searchValue }) => {
  if (!agent) {
    return null;
  }
  return (
    <>
      <EuiText size="s" color="subdued">
        <h4>
          <EuiHighlight search={searchValue}>{agent.name}</EuiHighlight>
        </h4>
        <p>
          <EuiHighlight search={searchValue}>{agent.description}</EuiHighlight>
        </p>
      </EuiText>
    </>
  );
};

export const useAgentOptions = ({
  agents,
  selectedAgentId,
}: {
  agents: AgentDefinition[];
  selectedAgentId?: string;
}) => {
  const agentOptions = useMemo(
    () =>
      agents.map((agent) => {
        let checked: 'on' | undefined;
        if (agent.id === selectedAgentId) {
          checked = 'on';
        }
        const option: AgentOptionData = {
          key: agent.id,
          label: agent.name,
          searchableLabel: `${agent.name} ${agent.description}`,
          checked,
          prepend: <AgentOptionPrepend agent={agent} />,
          data: { agent },
        };
        return option;
      }),
    [agents, selectedAgentId]
  );
  return {
    agentOptions,
    renderAgentOption: (props: AgentOptionProps) => <AgentOption {...props} />,
  };
};
