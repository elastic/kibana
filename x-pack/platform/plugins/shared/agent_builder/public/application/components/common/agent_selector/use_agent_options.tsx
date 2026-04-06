/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { AgentAvatar } from '../agent_avatar';
import { OptionText } from '../../conversations/conversation_input/input_actions/option_text';

type AgentOptionData = EuiSelectableOption<{ agent?: AgentDefinition }>;

interface AgentOptionProps {
  agent?: AgentDefinition;
}

const AgentOptionPrepend: React.FC<{ agent: AgentDefinition }> = ({ agent }) => {
  return (
    <EuiFlexGroup direction="column" justifyContent="flexStart">
      <EuiFlexItem grow={false}>
        <AgentAvatar agent={agent} size="l" color="subdued" shape="circle" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const AgentOption: React.FC<AgentOptionProps> = ({ agent }) => {
  if (!agent) {
    return null;
  }

  return (
    <OptionText>
      <EuiFlexGroup
        component="span"
        responsive={false}
        alignItems="center"
        gutterSize="s"
        direction="row"
        justifyContent="spaceBetween"
      >
        <EuiFlexItem component="span" grow={false}>
          {agent.name}
        </EuiFlexItem>
        <EuiFlexItem component="span" grow={false}>
          <EuiIconTip
            type="info"
            size="s"
            content={agent.description}
            position="right"
            anchorProps={{
              css: css`
                display: flex;
                justify-content: center;
              `,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </OptionText>
  );
};

export const useAgentOptions = ({
  agents,
  selectedAgentId,
}: {
  agents: AgentDefinition[];
  selectedAgentId?: string;
}) => {
  const agentOptions = useMemo(() => {
    const sorted = [...agents].sort((a, b) => {
      if (a.id === selectedAgentId) return -1;
      if (b.id === selectedAgentId) return 1;
      return 0;
    });
    return sorted.map((agent) => {
      let checked: 'on' | undefined;
      if (agent.id === selectedAgentId) {
        checked = 'on';
      }
      const option: AgentOptionData = {
        key: agent.id,
        label: agent.name,
        checked,
        prepend: <AgentOptionPrepend agent={agent} />,
        textWrap: 'wrap',
        data: { agent },
      };
      return option;
    });
  }, [agents, selectedAgentId]);
  return {
    agentOptions,
    renderAgentOption: (props: AgentOptionProps) => <AgentOption {...props} />,
  };
};
