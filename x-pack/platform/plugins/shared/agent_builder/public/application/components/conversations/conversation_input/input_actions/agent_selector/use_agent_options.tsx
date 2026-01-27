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
import { i18n } from '@kbn/i18n';
import { AgentAvatar } from '../../../../common/agent_avatar';
import { OptionText } from '../option_text';

type AgentOptionData = EuiSelectableOption<{ agent?: AgentDefinition }>;

interface AgentOptionProps {
  agent?: AgentDefinition;
}

const readonlyAgentTooltip = i18n.translate(
  'xpack.agentBuilder.agentSelector.readonlyAgentTooltip',
  {
    defaultMessage: 'This agent is read-only.',
  }
);

const AgentOptionPrepend: React.FC<{ agent: AgentDefinition }> = ({ agent }) => {
  return (
    <EuiFlexGroup direction="column" justifyContent="flexStart">
      <EuiFlexItem grow={false}>
        <AgentAvatar agent={agent} size="m" color="subdued" shape="square" />
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
      <EuiFlexGroup component="span" responsive={false} alignItems="center" gutterSize="s">
        <EuiFlexItem component="span" grow={false}>
          {agent.name}
        </EuiFlexItem>
        {agent.readonly && (
          <EuiFlexItem component="span" grow={false}>
            <EuiIconTip
              type="lock"
              size="m"
              content={readonlyAgentTooltip}
              anchorProps={{
                css: css`
                  display: flex;
                  justify-content: center;
                `,
              }}
            />
          </EuiFlexItem>
        )}
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
          checked,
          prepend: <AgentOptionPrepend agent={agent} />,
          textWrap: 'wrap',
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
