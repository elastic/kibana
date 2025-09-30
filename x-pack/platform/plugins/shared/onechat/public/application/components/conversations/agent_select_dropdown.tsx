/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiText,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopoverFooter,
  EuiButton,
  useEuiTheme,
} from '@elastic/eui';
import type { AgentDefinition } from '@kbn/onechat-common';
import { appPaths } from '../../utils/app_paths';
import { useNavigation } from '../../hooks/use_navigation';
import { labels } from '../../utils/i18n';

const agentSelectId = 'agentBuilderAgentSelect';

interface AgentSelectButtonProps {
  selectedAgentName?: string;
  onClick: () => void;
}

const AgentSelectButton: React.FC<AgentSelectButtonProps> = ({ selectedAgentName, onClick }) => (
  <EuiButtonEmpty
    iconSide="right"
    iconType="arrowDown"
    onClick={onClick}
    aria-haspopup="menu"
    aria-labelledby={agentSelectId}
  >
    {selectedAgentName}
  </EuiButtonEmpty>
);

interface AgentSelectDropdownProps {
  selectedAgent?: AgentDefinition;
  onAgentChange: (agentId: string) => void;
  agents?: AgentDefinition[];
}

export const AgentSelectDropdown: React.FC<AgentSelectDropdownProps> = ({
  selectedAgent,
  onAgentChange,
  agents = [],
}) => {
  const { euiTheme } = useEuiTheme();
  const { createOnechatUrl } = useNavigation();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const options: EuiSelectableOption[] = useMemo(
    () =>
      agents.map((agent) => ({
        key: agent.id,
        label: agent.name,
        checked: agent.id === selectedAgent?.id ? 'on' : undefined,
      })),
    [agents, selectedAgent?.id]
  );

  const handleAgentChange = useCallback(
    (value: EuiSelectableOption[]) => {
      const newAgentId = value.find((v) => v.checked === 'on')?.key;
      if (newAgentId) {
        onAgentChange(newAgentId);
        setIsPopoverOpen(false);
      }
    },
    [onAgentChange]
  );

  const panelStyles = css`
    inline-size: calc(${euiTheme.size.xxl} * 7);
  `;

  return (
    <EuiPopover
      panelProps={{ css: panelStyles }}
      panelPaddingSize="none"
      button={
        <AgentSelectButton
          selectedAgentName={selectedAgent?.name}
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        />
      }
      isOpen={isPopoverOpen}
      anchorPosition="upRight"
      closePopover={() => setIsPopoverOpen(false)}
    >
      <EuiSelectable
        id={agentSelectId}
        aria-label={labels.conversations.selectAgentAriaLabel}
        searchable={false}
        options={options}
        onChange={handleAgentChange}
        singleSelection
      >
        {(list) => (
          <>
            <EuiPopoverTitle paddingSize="s">
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText
                    css={css`
                      font-weight: ${euiTheme.font.weight.bold};
                    `}
                    size="xs"
                  >
                    {labels.conversations.title}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <EuiLink href={createOnechatUrl(appPaths.agents.list)}>
                      {labels.conversations.manageAgents}
                    </EuiLink>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPopoverTitle>
            {list}
            <EuiPopoverFooter paddingSize="s">
              <EuiButton
                iconSide="left"
                iconType="plus"
                size="s"
                fullWidth
                href={createOnechatUrl(appPaths.agents.new)}
              >
                {labels.conversations.createAnAgent}
              </EuiButton>
            </EuiPopoverFooter>
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
