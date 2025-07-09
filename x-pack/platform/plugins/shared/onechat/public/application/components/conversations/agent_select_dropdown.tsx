/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/css';
import { EuiSuperSelect, EuiSuperSelectOption, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AgentProfile } from '@kbn/onechat-common';
import { oneChatDefaultAgentId } from '@kbn/onechat-common';
import { useOnechatAgents } from '../../hooks/use_agents';

interface AgentSelectDropdownProps {
  selectedAgentId?: string;
  onAgentChange: (agentId: string) => void;
  disabled?: boolean;
}

export const AgentSelectDropdown: React.FC<AgentSelectDropdownProps> = ({
  selectedAgentId,
  onAgentChange,
  disabled = false,
}) => {
  const { agentProfiles, isLoading } = useOnechatAgents();

  const agentDropdownClass = css`
    min-width: 200px;
  `;

  const agentOptions: Array<EuiSuperSelectOption<string>> = useMemo(() => {
    const customAgents = agentProfiles.map((agent: AgentProfile) => ({
      value: agent.id,
      inputDisplay: agent.name,
      dropdownDisplay: (
        <div>
          <EuiText size="s">{agent.name}</EuiText>
          <EuiText size="xs" color="subdued">
            {agent.description}
          </EuiText>
        </div>
      ),
    }));

    // Append default agent option
    const defaultAgentOption = {
      value: oneChatDefaultAgentId,
      inputDisplay: i18n.translate('xpack.onechat.agentDropdown.defaultAgent.name', {
        defaultMessage: 'Default Agent',
      }),
      dropdownDisplay: (
        <div>
          <EuiText size="s">
            {i18n.translate('xpack.onechat.agentDropdown.defaultAgent.name', {
              defaultMessage: 'Default Agent',
            })}
          </EuiText>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.onechat.agentDropdown.defaultAgent.description', {
              defaultMessage: 'Agent capable of dealing with general queries',
            })}
          </EuiText>
        </div>
      ),
    };

    return [defaultAgentOption, ...customAgents];
  }, [agentProfiles]);

  return (
    <div className={agentDropdownClass}>
      <EuiSuperSelect
        options={agentOptions}
        valueOfSelected={selectedAgentId}
        onChange={onAgentChange}
        disabled={disabled || isLoading}
        isLoading={isLoading}
        defaultValue={oneChatDefaultAgentId}
        placeholder={i18n.translate('xpack.onechat.agentDropdown.placeholder', {
          defaultMessage: 'Select an agent...',
        })}
        compressed
      />
    </div>
  );
};
