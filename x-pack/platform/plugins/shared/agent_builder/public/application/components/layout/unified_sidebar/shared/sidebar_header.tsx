/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0".
 */

import React from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

import { getEbtProps } from '@kbn/ebt-click';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getLastAgentId } from '../../../../hooks/use_last_agent_id';
import { appPaths } from '../../../../utils/app_paths';
import {
  conversationHeaderRowStyles,
  conversationHeaderShellStyles,
} from '../../../conversations/conversation.styles';
import { AgentSelector } from './agent_selector';

const labels = {
  manageComponents: i18n.translate('xpack.agentBuilder.sidebar.header.manageComponents', {
    defaultMessage: 'Manage components',
  }),
  toggleSidebar: i18n.translate('xpack.agentBuilder.sidebar.header.toggleSidebar', {
    defaultMessage: 'Toggle sidebar',
  }),
};

interface SidebarHeaderProps {
  sidebarView: 'conversation' | 'manage';
  agentId: string;
  getNavigationPath: (newAgentId: string) => string;
  isPopoverMode?: boolean;
  onToggleCondensed: () => void;
}

const headerLayerStyles = css`
  flex-shrink: 0;
`;

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  sidebarView,
  agentId,
  getNavigationPath,
  isPopoverMode = false,
  onToggleCondensed,
}) => {
  const { euiTheme } = useEuiTheme();
  const navigate = useNavigate();

  const headerShellStyles = conversationHeaderShellStyles(euiTheme);
  const headerRowStyles = conversationHeaderRowStyles(euiTheme);

  const rowContentStyles = css`
    width: 100%;
  `;

  return (
    <div css={[headerShellStyles, headerLayerStyles]}>
      <div css={headerRowStyles}>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="s"
          css={rowContentStyles}
        >
          {sidebarView === 'conversation' ? (
            <EuiFlexItem grow={true}>
              <AgentSelector agentId={agentId} getNavigationPath={getNavigationPath} />
            </EuiFlexItem>
          ) : (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="arrowLeft"
                iconSide="left"
                size="s"
                flush="both"
                color="text"
                onClick={() => {
                  navigate(appPaths.agent.root({ agentId: getLastAgentId() }));
                }}
                {...getEbtProps({
                  element: AGENT_BUILDER_UI_EBT.element.sidebar,
                  action: AGENT_BUILDER_UI_EBT.action.navSidebar.SIDEBAR_LAYER_TRANSITION,
                  detail: AGENT_BUILDER_UI_EBT.detail.layerTransition.BACK_CLICK,
                })}
              >
                {labels.manageComponents}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiToolTip content={labels.toggleSidebar} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType={isPopoverMode ? 'transitionLeftIn' : 'transitionLeftOut'}
                aria-label={labels.toggleSidebar}
                aria-expanded={!isPopoverMode}
                color="text"
                size="xs"
                onClick={onToggleCondensed}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
};
