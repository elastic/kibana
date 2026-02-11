/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiSelectable,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUiPrivileges } from '../../../../../hooks/use_ui_privileges';
import { useHasActiveConversation } from '../../../../../hooks/use_conversation';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { appPaths } from '../../../../../utils/app_paths';
import { RobotIcon } from '../../../../common/icons/robot';
import {
  getMaxListHeight,
  selectorPopoverPanelStyles,
  useSelectorListStyles,
} from '../input_actions.styles';
import { useAgentOptions } from './use_agent_options';
import { InputPopoverButton } from '../input_popover_button';
import { AgentAvatar } from '../../../../common/agent_avatar';

const AGENT_OPTION_ROW_HEIGHT = 44;

const selectAgentAriaLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.agentSelector.selectAgent.ariaLabel',
  {
    defaultMessage: 'Select an agent',
  }
);
const selectAgentFallbackButtonLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.agentSelector.fallbackButtonLabel',
  { defaultMessage: 'Agents' }
);
const createAgentAriaLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.agentSelector.createAgent.ariaLabel',
  {
    defaultMessage: 'Create an agent',
  }
);
const manageAgentsAriaLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.agentSelector.manageAgents.ariaLabel',
  {
    defaultMessage: 'Manage agents',
  }
);

const agentSelectId = 'agentBuilderAgentSelect';
const agentListId = `${agentSelectId}_listbox`;

const AgentSelectPopoverButton: React.FC<{
  isPopoverOpen: boolean;
  selectedAgent?: AgentDefinition;
  onClick: () => void;
}> = ({ isPopoverOpen, selectedAgent, onClick }) => {
  const hasActiveConversation = useHasActiveConversation();
  const iconType = selectedAgent ? () => <AgentAvatar agent={selectedAgent} size="s" /> : RobotIcon;
  return (
    <InputPopoverButton
      open={isPopoverOpen}
      disabled={hasActiveConversation}
      iconType={iconType}
      onClick={onClick}
      aria-labelledby={agentSelectId}
      data-test-subj="agentBuilderAgentSelectorButton"
    >
      {selectedAgent?.name ?? selectAgentFallbackButtonLabel}
    </InputPopoverButton>
  );
};

const AgentListFooter: React.FC = () => {
  const { manageAgents } = useUiPrivileges();
  const { createAgentBuilderUrl } = useNavigation();
  const createAgentHref = createAgentBuilderUrl(appPaths.agents.new);
  const manageAgentsHref = createAgentBuilderUrl(appPaths.agents.list);
  return (
    <EuiPopoverFooter paddingSize="s">
      <EuiFlexGroup responsive={false} justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem>
          <EuiButtonEmpty
            size="s"
            iconType="gear"
            color="text"
            aria-label={manageAgentsAriaLabel}
            href={manageAgentsHref}
            disabled={!manageAgents}
          >
            <FormattedMessage
              id="xpack.agentBuilder.conversationInput.agentSelector.manageAgents"
              defaultMessage="Manage"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonEmpty
            size="s"
            iconType="plus"
            aria-label={createAgentAriaLabel}
            href={createAgentHref}
            disabled={!manageAgents}
          >
            <FormattedMessage
              id="xpack.agentBuilder.conversationInput.agentSelector.createNewAgent"
              defaultMessage="New"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopoverFooter>
  );
};

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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { agentOptions, renderAgentOption } = useAgentOptions({
    agents,
    selectedAgentId: selectedAgent?.id,
  });
  const selectorListStyles = css`
    ${useSelectorListStyles({ listId: agentListId })}
    &#${agentListId} .euiSelectableListItem {
      align-items: flex-start;
    }
  `;

  const listItemsHeight = agentOptions.length * AGENT_OPTION_ROW_HEIGHT;
  // Calculate height based on item count, capped at max rows
  const listHeight = Math.min(listItemsHeight, getMaxListHeight({ withFooter: true }));

  return (
    <EuiPopover
      panelProps={{ css: selectorPopoverPanelStyles }}
      panelPaddingSize="none"
      button={
        <AgentSelectPopoverButton
          isPopoverOpen={isPopoverOpen}
          selectedAgent={selectedAgent}
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        />
      }
      isOpen={isPopoverOpen}
      anchorPosition="upCenter"
      closePopover={() => setIsPopoverOpen(false)}
    >
      <EuiSelectable
        id={agentSelectId}
        aria-label={selectAgentAriaLabel}
        options={agentOptions}
        onChange={(_options, _event, changedOption) => {
          const { checked, key: agentId } = changedOption;
          const isChecked = checked === 'on';
          if (isChecked && agentId) {
            onAgentChange(agentId);
            setIsPopoverOpen(false);
          }
        }}
        singleSelection
        renderOption={(option) => renderAgentOption({ agent: option.agent })}
        height={listHeight}
        listProps={{
          id: agentListId,
          isVirtualized: true,
          rowHeight: AGENT_OPTION_ROW_HEIGHT,
          onFocusBadge: false,
          css: selectorListStyles,
        }}
      >
        {(list) => (
          <>
            {list}
            <AgentListFooter />
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
