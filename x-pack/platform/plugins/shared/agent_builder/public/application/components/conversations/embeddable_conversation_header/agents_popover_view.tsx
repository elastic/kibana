/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSelectable,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { useAgentOptions } from '../../common/agent_selector/use_agent_options';
import { useSelectorListStyles } from '../conversation_input/input_actions/input_actions.styles';

const labels = {
  availableAgents: i18n.translate('xpack.agentBuilder.embeddableAgentsView.availableAgents', {
    defaultMessage: 'Available agents',
  }),
  agentDetails: i18n.translate('xpack.agentBuilder.embeddableAgentsView.agentDetails', {
    defaultMessage: 'Agent details',
  }),
  selectAgent: i18n.translate('xpack.agentBuilder.embeddableAgentsView.selectAgent', {
    defaultMessage: 'Select an agent',
  }),
};

type AgentOption = EuiSelectableOption<{ agent?: AgentDefinition }>;

interface AgentsPopoverViewProps {
  panelHeight: number;
  panelWidth: number;
  onBack: () => void;
  onClose: () => void;
}

export const AgentsPopoverView: React.FC<AgentsPopoverViewProps> = ({
  panelHeight,
  panelWidth,
  onBack,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const { agentId, setAgentId } = useConversationContext();
  const { agents } = useAgentBuilderAgents();
  const { agentOptions, renderAgentOption } = useAgentOptions({ agents, selectedAgentId: agentId });

  const agentListStyles = css`
    ${useSelectorListStyles({ listId: 'agentBuilderEmbeddableAgentsList' })}
    &#agentBuilderEmbeddableAgentsList .euiSelectableListItem {
      align-items: flex-start;
    }
  `;

  const { createAgentBuilderUrl } = useNavigation();
  const agentDetailsHref = agentId
    ? createAgentBuilderUrl(appPaths.agent.overview({ agentId }))
    : undefined;

  const handleAgentChange = (
    _options: AgentOption[],
    _event: unknown,
    changedOption: AgentOption
  ) => {
    const { checked, key: newAgentId } = changedOption;
    if (checked === 'on' && newAgentId) {
      setAgentId?.(newAgentId);
      onClose();
    }
  };

  const rowPaddingStyles = css`
    padding: ${euiTheme.size.base};
  `;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      css={css`
        width: ${panelWidth}px;
        height: ${panelHeight}px;
      `}
    >
      {/* Header row — back button + agent details link */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
          gutterSize="none"
          css={rowPaddingStyles}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="text"
              iconType="arrowLeft"
              size="s"
              flush="left"
              onClick={onBack}
            >
              {labels.availableAgents}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="popout"
              iconSide="right"
              color="text"
              fill={false}
              href={agentDetailsHref}
              target="_blank"
              data-test-subj="agentBuilderEmbeddableAgentDetailsButton"
            >
              {labels.agentDetails}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiHorizontalRule margin="none" />

      {/* Agents list — scrollable */}
      <EuiFlexItem
        grow
        css={css`
          overflow-y: auto;
          min-height: 0;
        `}
      >
        <EuiSelectable
          aria-label={labels.selectAgent}
          options={agentOptions}
          onChange={handleAgentChange}
          singleSelection
          renderOption={(option) => renderAgentOption({ agent: option.agent })}
          listProps={{
            id: 'agentBuilderEmbeddableAgentsList',
            isVirtualized: false,
            onFocusBadge: false,
            bordered: false,
            css: agentListStyles,
          }}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
