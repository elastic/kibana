/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { AgentDefinition } from '@kbn/onechat-common';
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { appPaths } from '../../../../../utils/app_paths';
import { labels } from '../../../../../utils/i18n';

const agentSelectId = 'agentBuilderAgentSelect';

interface AgentSelectButtonProps {
  selectedAgentName?: string;
  onClick: () => void;
}

const AgentSelectButton: React.FC<AgentSelectButtonProps> = ({ selectedAgentName, onClick }) => (
  <EuiButtonEmpty
    iconSide="right"
    flush="both"
    iconType="arrowDown"
    onClick={onClick}
    aria-haspopup="menu"
    aria-labelledby={agentSelectId}
    data-test-subj="agentBuilderAgentSelectorButton"
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
    inline-size: calc(${euiTheme.size.xxxl} * 10);
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
      anchorPosition="upCenter"
      closePopover={() => setIsPopoverOpen(false)}
    >
      <EuiSelectable
        id={agentSelectId}
        aria-label={labels.conversations.selectAgentAriaLabel}
        searchable
        options={options}
        onChange={handleAgentChange}
        singleSelection
      >
        {(list, search) => (
          <>
            <EuiPopoverTitle paddingSize="s">
              <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" alignItems="center">
                <EuiFlexItem grow={true}>{search}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="plus"
                    color="text"
                    aria-label={labels.conversations.createAnAgent}
                    href={createOnechatUrl(appPaths.agents.new)}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="gear"
                    color="text"
                    aria-label={labels.conversations.manageAgents}
                    href={createOnechatUrl(appPaths.agents.list)}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPopoverTitle>
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
