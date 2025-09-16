/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
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
} from '@elastic/eui';
import { oneChatDefaultAgentId } from '@kbn/onechat-common';
import { useOnechatAgents } from '../../hooks/agents/use_agents';
import { appPaths } from '../../utils/app_paths';
import { useNavigation } from '../../hooks/use_navigation';
import { labels } from '../../utils/i18n';

const POPOVER_WIDTH = 280;
const popoverContentStyle = {
  width: POPOVER_WIDTH,
};

interface AgentSelectButtonProps {
  selectedAgentName?: string;
  isLoading: boolean;
  onClick: () => void;
}

const AgentSelectButton: React.FC<AgentSelectButtonProps> = ({
  selectedAgentName,
  isLoading,
  onClick,
}) => (
  <EuiButtonEmpty
    isLoading={isLoading}
    iconSide="right"
    iconType="arrowDown"
    onClick={onClick}
    aria-haspopup="menu"
  >
    {selectedAgentName}
  </EuiButtonEmpty>
);

interface AgentSelectDropdownProps {
  selectedAgentId?: string;
  onAgentChange: (agentId: string) => void;
}

export const AgentSelectDropdown: React.FC<AgentSelectDropdownProps> = ({
  selectedAgentId = oneChatDefaultAgentId,
  onAgentChange,
}) => {
  const { agents, isLoading } = useOnechatAgents();
  const { navigateToOnechatUrl } = useNavigation();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId),
    [agents, selectedAgentId]
  );

  const options: EuiSelectableOption[] = useMemo(
    () =>
      agents.map((agent) => ({
        key: agent.id,
        label: agent.name,
        checked: agent.id === selectedAgentId ? 'on' : undefined,
      })),
    [agents, selectedAgentId]
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

  const togglePopover = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen]);

  return (
    <EuiPopover
      panelPaddingSize="none"
      button={
        <AgentSelectButton
          selectedAgentName={selectedAgent?.name}
          isLoading={isLoading}
          onClick={togglePopover}
        />
      }
      isOpen={isPopoverOpen}
      anchorPosition="upRight"
      closePopover={() => setIsPopoverOpen(false)}
    >
      <EuiSelectable
        aria-label={labels.agents.selectAgentAriaLabel}
        searchable={false}
        options={options}
        onChange={handleAgentChange}
        singleSelection
        isLoading={isLoading}
      >
        {(list) => (
          <div style={popoverContentStyle}>
            <EuiPopoverTitle paddingSize="s">
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <strong>{labels.agents.title}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <EuiLink onClick={() => navigateToOnechatUrl(appPaths.agents.list)}>
                      {labels.agents.manageAgents}
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
                onClick={() => navigateToOnechatUrl(appPaths.agents.new)}
              >
                {labels.agents.createAnAgent}
              </EuiButton>
            </EuiPopoverFooter>
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
