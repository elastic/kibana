/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { i18n } from '@kbn/i18n';
import type { AgentDefinition } from '@kbn/onechat-common';
import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { appPaths } from '../../../../../utils/app_paths';
import { iconRobot } from '../../../../common/icons/robot';
import { usePopoverButtonStyles } from '../input_actions.styles';
import { useAgentOptions } from './use_agent_options';

const AGENT_OPTION_ROW_HEIGHT = 88;

const selectAgentAriaLabel = i18n.translate(
  'xpack.onechat.conversationInput.agentSelector.selectAgent.ariaLabel',
  {
    defaultMessage: 'Select an agent',
  }
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

const AgentSelectPopoverButton: React.FC<{
  isPopoverOpen: boolean;
  selectedAgentName?: string;
  onClick: () => void;
}> = ({ isPopoverOpen, selectedAgentName, onClick }) => {
  const popoverButtonStyles = usePopoverButtonStyles({ open: isPopoverOpen });
  return (
    <EuiButtonEmpty
      color="text"
      css={popoverButtonStyles}
      iconSide="left"
      iconType={iconRobot}
      onClick={onClick}
      aria-haspopup="menu"
      aria-labelledby={agentSelectId}
      data-test-subj="agentBuilderAgentSelectorButton"
    >
      {selectedAgentName}
    </EuiButtonEmpty>
  );
};

const AgentPopoverTitle: React.FC<{ search: ReactNode }> = ({ search }) => {
  const { createOnechatUrl } = useNavigation();
  const createAgentHref = createOnechatUrl(appPaths.agents.new);
  const manageAgentsHref = createOnechatUrl(appPaths.agents.list);
  return (
    <EuiPopoverTitle paddingSize="s">
      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={true}>{search}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="plus"
            color="text"
            aria-label={createAgentAriaLabel}
            href={createAgentHref}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="gear"
            color="text"
            aria-label={manageAgentsAriaLabel}
            href={manageAgentsHref}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopoverTitle>
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
    inline-size: calc(${euiTheme.size.xxxl} * 10);
  `;

  const { agentOptions, renderAgentOption } = useAgentOptions({
    agents,
    selectedAgentId: selectedAgent?.id,
  });

  return (
    <EuiPopover
      panelProps={{ css: panelStyles }}
      panelPaddingSize="none"
      button={
        <AgentSelectPopoverButton
          isPopoverOpen={isPopoverOpen}
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
        listProps={{ isVirtualized: true, rowHeight: AGENT_OPTION_ROW_HEIGHT }}
      >
        {(list, search) => (
          <div>
            <AgentPopoverTitle search={search} />
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
