/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiPopoverFooter,
  EuiSelectable,
  EuiText,
  EuiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiPopoverProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AgentDefinition } from '@kbn/agent-builder-common';

import { useUiPrivileges } from '../../../hooks/use_ui_privileges';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import {
  selectorPopoverPanelStyles,
  useSelectorListStyles,
} from '../../conversations/conversation_input/input_actions/input_actions.styles';
import { useAgentOptions } from './use_agent_options';

const SELECTOR_POPOVER_HEIGHT = 400;
const AGENT_OPTION_ROW_HEIGHT = 52; // 48px content + 4px bottom gap
const HORIZONTAL_RULE_HEIGHT = 1;
const AGENT_SELECTOR_HEADER_HEIGHT = 56;
const AGENT_SELECTOR_FOOTER_HEIGHT = 64;

const labels = {
  selectAgent: i18n.translate('xpack.agentBuilder.agentSelectorDropdown.selectAgent.ariaLabel', {
    defaultMessage: 'Select an agent',
  }),
  availableAgents: i18n.translate('xpack.agentBuilder.agentSelectorDropdown.availableAgents', {
    defaultMessage: 'Available agents',
  }),
  newAgent: i18n.translate('xpack.agentBuilder.agentSelectorDropdown.newAgent', {
    defaultMessage: 'New agent',
  }),
  manageAgents: i18n.translate('xpack.agentBuilder.agentSelectorDropdown.manageAgents', {
    defaultMessage: 'Manage agents',
  }),
};

const agentSelectId = 'agentBuilderAgentSelectorDropdown';
const agentListId = `${agentSelectId}_listbox`;

const AgentListHeader: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { manageAgents } = useUiPrivileges();
  const { createAgentBuilderUrl } = useNavigation();
  const createAgentHref = createAgentBuilderUrl(appPaths.agents.new);
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      responsive={false}
      gutterSize="s"
      css={css`
        padding: ${euiTheme.size.s} ${euiTheme.size.base};
        block-size: ${AGENT_SELECTOR_HEADER_HEIGHT}px;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{labels.availableAgents}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          iconType="plus"
          iconSide="left"
          color="text"
          {...(manageAgents ? { href: createAgentHref } : { disabled: true })}
          data-test-subj="agentBuilderAgentSelectorNewAgentButton"
        >
          {labels.newAgent}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const AgentListFooter: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { manageAgents } = useUiPrivileges();
  const { createAgentBuilderUrl } = useNavigation();
  const manageAgentsHref = createAgentBuilderUrl(appPaths.agents.list);
  return (
    <EuiPopoverFooter
      paddingSize="m"
      css={css`
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
      `}
    >
      <EuiButton
        {...(manageAgents ? { href: manageAgentsHref } : { disabled: true })}
        fullWidth
        size="s"
        data-test-subj="agentBuilderAgentSelectorManageAgentsButton"
      >
        {labels.manageAgents}
      </EuiButton>
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
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { agentOptions, renderAgentOption } = useAgentOptions({
    agents,
    selectedAgentId: selectedAgent?.id,
  });

  const maxListHeight =
    SELECTOR_POPOVER_HEIGHT -
    AGENT_SELECTOR_HEADER_HEIGHT -
    HORIZONTAL_RULE_HEIGHT -
    AGENT_SELECTOR_FOOTER_HEIGHT -
    HORIZONTAL_RULE_HEIGHT;
  const listHeight = Math.min(agentOptions.length * AGENT_OPTION_ROW_HEIGHT, maxListHeight);

  const selectorListStyles = css`
    ${useSelectorListStyles({ listId: agentListId })}
    &#${agentListId} .euiSelectableListItem {
      align-items: flex-start;
      padding-bottom: ${euiTheme.size.xs};
    }
  `;

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
      <EuiText size="m">
        <strong>
          {
            <EuiTextTruncate
              text={selectedAgent?.name ?? fallbackLabel ?? ''}
              truncation="end"
              width={180}
            />
          }
        </strong>
      </EuiText>
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      aria-label={labels.selectAgent}
      panelProps={{
        css: css`
          ${selectorPopoverPanelStyles}
        `,
      }}
      panelPaddingSize="none"
      button={triggerButton}
      isOpen={isPopoverOpen}
      anchorPosition={anchorPosition}
      closePopover={() => setIsPopoverOpen(false)}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        css={css`
          height: 100%;
        `}
      >
        <EuiFlexItem grow={false}>
          <AgentListHeader />
        </EuiFlexItem>

        <EuiHorizontalRule margin="none" />

        <EuiFlexItem grow={false}>
          <EuiSelectable
            id={agentSelectId}
            aria-label={labels.selectAgent}
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
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
