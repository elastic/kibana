/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AgentDefinition } from '@kbn/onechat-common';
import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHasActiveConversation } from '../../../../../hooks/use_conversation';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { appPaths } from '../../../../../utils/app_paths';
import { RobotIcon } from '../../../../common/icons/robot';
import { getMaxListHeight, useSelectorListStyles } from '../input_actions.styles';
import { useAgentOptions } from './use_agent_options';
import { InputPopoverButton } from '../input_popover_button';
import { SelectorListHeader } from '../selector_list_header';
import { AgentAvatar } from '../../../../common/agent_avatar';

const AGENT_OPTION_ROW_HEIGHT = 88;

const selectAgentAriaLabel = i18n.translate(
  'xpack.onechat.conversationInput.agentSelector.selectAgent.ariaLabel',
  {
    defaultMessage: 'Select an agent',
  }
);
const selectAgentFallbackButtonLabel = i18n.translate(
  'xpack.onechat.conversationInput.agentSelector.fallbackButtonLabel',
  { defaultMessage: 'Agents' }
);
const createAgentAriaLabel = i18n.translate(
  'xpack.onechat.conversationInput.agentSelector.createAgent.ariaLabel',
  {
    defaultMessage: 'Create an agent',
  }
);
const manageAgentsAriaLabel = i18n.translate(
  'xpack.onechat.conversationInput.agentSelector.manageAgents.ariaLabel',
  {
    defaultMessage: 'Manage agents',
  }
);
const agentSearchPlaceholder = i18n.translate(
  'xpack.onechat.conversationInput.agentSelector.search.placeholder',
  { defaultMessage: 'Search agents' }
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

const AgentListHeader: React.FC<{ search: ReactNode }> = ({ search }) => {
  const { createOnechatUrl } = useNavigation();
  const createAgentHref = createOnechatUrl(appPaths.agents.new);
  const manageAgentsHref = createOnechatUrl(appPaths.agents.list);
  return (
    <SelectorListHeader>
      <EuiFlexItem grow={true}>{search}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          iconType="plus"
          color="text"
          aria-label={createAgentAriaLabel}
          href={createAgentHref}
        >
          <FormattedMessage
            id="xpack.onechat.conversationInput.agentSelector.createNewAgent"
            defaultMessage="New"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          size="m"
          iconType="gear"
          color="text"
          aria-label={manageAgentsAriaLabel}
          href={manageAgentsHref}
        />
      </EuiFlexItem>
    </SelectorListHeader>
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
  const { euiTheme } = useEuiTheme();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const panelStyles = css`
    inline-size: calc(${euiTheme.size.xxl} * 11);
  `;

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
  const listHeight = Math.min(listItemsHeight, getMaxListHeight({ withHeader: true }));

  return (
    <EuiPopover
      panelProps={{ css: panelStyles }}
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
        searchable
        searchProps={{ placeholder: agentSearchPlaceholder }}
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
        renderOption={(option, searchValue) =>
          renderAgentOption({ agent: option.agent, searchValue })
        }
        height={listHeight}
        listProps={{
          id: agentListId,
          isVirtualized: true,
          rowHeight: AGENT_OPTION_ROW_HEIGHT,
          onFocusBadge: false,
          css: selectorListStyles,
        }}
      >
        {(list, search) => (
          <div>
            <AgentListHeader search={search} />
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
