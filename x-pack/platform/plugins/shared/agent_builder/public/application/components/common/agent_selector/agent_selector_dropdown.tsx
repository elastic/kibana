/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiSelectable,
} from '@elastic/eui';
import type { EuiPopoverProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AgentDefinition } from '@kbn/agent-builder-common';

import { useUiPrivileges } from '../../../hooks/use_ui_privileges';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import {
  getMaxListHeight,
  selectorPopoverPanelStyles,
  useSelectorListStyles,
} from '../../conversations/conversation_input/input_actions/input_actions.styles';
import { useAgentOptions } from './use_agent_options';

const AGENT_OPTION_ROW_HEIGHT = 44;

const selectAgentAriaLabel = i18n.translate(
  'xpack.agentBuilder.agentSelectorDropdown.selectAgent.ariaLabel',
  { defaultMessage: 'Select an agent' }
);
const createAgentAriaLabel = i18n.translate(
  'xpack.agentBuilder.agentSelectorDropdown.createAgent.ariaLabel',
  { defaultMessage: 'Create an agent' }
);
const manageAgentsAriaLabel = i18n.translate(
  'xpack.agentBuilder.agentSelectorDropdown.manageAgents.ariaLabel',
  { defaultMessage: 'Manage agents' }
);

const agentSelectId = 'agentBuilderAgentSelectorDropdown';
const agentListId = `${agentSelectId}_listbox`;

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
              id="xpack.agentBuilder.agentSelectorDropdown.manageAgents"
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
              id="xpack.agentBuilder.agentSelectorDropdown.createNewAgent"
              defaultMessage="New"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopoverFooter>
  );
};

export interface AgentSelectorDropdownProps {
  agents: AgentDefinition[];
  selectedAgent?: AgentDefinition;
  onAgentChange: (agentId: string) => void;
  anchorPosition?: EuiPopoverProps['anchorPosition'];
  /** Shown in the trigger button when selectedAgent is undefined (e.g. deleted agent) */
  fallbackLabel?: string;
}

export const AgentSelectorDropdown: React.FC<AgentSelectorDropdownProps> = ({
  agents,
  selectedAgent,
  onAgentChange,
  anchorPosition = 'downLeft',
  fallbackLabel,
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
  const listHeight = Math.min(listItemsHeight, getMaxListHeight({ withFooter: true }));

  const triggerButton = (
    <EuiButtonEmpty
      size="s"
      iconType="arrowDown"
      iconSide="right"
      flush="both"
      color="text"
      onClick={() => setIsPopoverOpen((v) => !v)}
      data-test-subj="agentBuilderAgentSelectorButton"
    >
      {selectedAgent?.name ?? fallbackLabel}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      panelProps={{ css: selectorPopoverPanelStyles }}
      panelPaddingSize="none"
      button={triggerButton}
      isOpen={isPopoverOpen}
      anchorPosition={anchorPosition}
      closePopover={() => setIsPopoverOpen(false)}
    >
      <EuiSelectable
        id={agentSelectId}
        aria-label={selectAgentAriaLabel}
        options={agentOptions}
        onChange={(_options, _event, changedOption) => {
          const { checked, key: agentId } = changedOption;
          if (checked === 'on' && agentId) {
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
