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
  EuiHighlight,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { AgentDefinition } from '@kbn/onechat-common';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { appPaths } from '../../../../../utils/app_paths';
import { labels } from '../../../../../utils/i18n';
import { AgentAvatar } from '../../../../common/agent_avatar';

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

const AgentOptionPrepend: React.FC<{ agent: AgentDefinition }> = ({ agent }) => {
  const { euiTheme } = useEuiTheme();
  const panelStyles = css`
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
  `;
  return (
    <EuiPanel css={panelStyles} hasShadow={false}>
      <AgentAvatar size="s" agent={agent} />
    </EuiPanel>
  );
};

type AgentOptionData = EuiSelectableOption<{ agent?: AgentDefinition }>;

const AgentOption: React.FC<{ agent?: AgentDefinition; searchValue: string }> = ({
  agent,
  searchValue,
}) => {
  if (!agent) {
    return null;
  }
  return (
    <>
      <EuiText size="s" color="subdued">
        <h4>
          <EuiHighlight search={searchValue}>{agent.name}</EuiHighlight>
        </h4>
        <p>
          <EuiHighlight search={searchValue}>{agent.description}</EuiHighlight>
        </p>
      </EuiText>
    </>
  );
};

const AGENT_OPTION_ROW_HEIGHT = 88;

const agentSearchPlaceholder = i18n.translate(
  'xpack.onechat.conversationInput.agentSelector.search.placeholder',
  { defaultMessage: 'Search agents' }
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

  const options = useMemo(
    () =>
      agents.map((agent) => {
        let checked: 'on' | undefined;
        if (agent.id === selectedAgent?.id) {
          checked = 'on';
        }
        const option: AgentOptionData = {
          key: agent.id,
          label: agent.name,
          searchableLabel: `${agent.name} ${agent.description}`,
          checked,
          prepend: <AgentOptionPrepend agent={agent} />,
          data: { agent },
        };
        return option;
      }),
    [agents, selectedAgent?.id]
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
        searchProps={{ placeholder: agentSearchPlaceholder }}
        options={options}
        onChange={(_options, _event, changedOption) => {
          const { checked, key: agentId } = changedOption;
          const isChecked = checked === 'on';
          if (isChecked && agentId) {
            onAgentChange(agentId);
            setIsPopoverOpen(false);
          }
        }}
        singleSelection
        renderOption={({ agent }, searchValue) => {
          return <AgentOption agent={agent} searchValue={searchValue} />;
        }}
        listProps={{ isVirtualized: true, rowHeight: AGENT_OPTION_ROW_HEIGHT }}
      >
        {(list, search) => (
          <div>
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
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
