/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type ComponentProps, useCallback, useEffect } from 'react';
import { EuiButton, EuiButtonIcon, EuiShowFor, EuiToolTip, EuiWindowEvent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { isMac } from '@kbn/shared-ux-utility';
import type { AgentBuilderPluginStart, AgentBuilderStartDependencies } from '../../types';
import { RobotIcon } from '../../application/components/common/icons/robot';
import { useUiPrivileges } from '../../application/hooks/use_ui_privileges';

const isSemicolon = (event: KeyboardEvent) => event.code === 'Semicolon' || event.key === ';';

interface AgentBuilderNavControlServices {
  agentBuilder: AgentBuilderPluginStart;
  aiAssistantManagementSelection: AgentBuilderStartDependencies['aiAssistantManagementSelection'];
}

export function AgentBuilderNavControl() {
  const {
    services: { agentBuilder, aiAssistantManagementSelection },
  } = useKibana<AgentBuilderNavControlServices>();

  const { show: hasShowPrivilege } = useUiPrivileges();

  const toggleSidebar = useCallback(() => {
    agentBuilder.toggleConversationFlyout();
  }, [agentBuilder]);

  useEffect(() => {
    if (!hasShowPrivilege) {
      return;
    }

    const openChatSubscription = aiAssistantManagementSelection.openChat$.subscribe((selection) => {
      if (selection === AIChatExperience.Agent) {
        agentBuilder.openConversationFlyout();
        aiAssistantManagementSelection.completeOpenChat();
      }
    });

    return () => {
      openChatSubscription.unsubscribe();
    };
  }, [hasShowPrivilege, agentBuilder, aiAssistantManagementSelection]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isSemicolon(event) && (isMac ? event.metaKey : event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    },
    [toggleSidebar]
  );

  if (!hasShowPrivilege) {
    return null;
  }

  const tooltipContent = (
    <div style={{ textAlign: 'center' }}>
      <span>{buttonLabel}</span>
      <br />
      <span>{shortcutLabel}</span>
    </div>
  );

  const AgentBuilderButton: React.FC<
    ComponentProps<typeof EuiButton> & ComponentProps<typeof EuiButtonIcon>
  > = (props) => (
    <>
      <EuiShowFor sizes={['m', 'l', 'xl']}>
        <EuiButton {...props} data-test-subj="AgentBuilderNavControlButton" />
      </EuiShowFor>
      <EuiShowFor sizes={['xs', 's']}>
        <EuiButtonIcon
          {...props}
          display="base"
          data-test-subj="AgentBuilderNavControlButtonIcon"
        />
      </EuiShowFor>
    </>
  );

  return (
    <>
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      <EuiToolTip content={tooltipContent}>
        <AgentBuilderButton
          aria-label={buttonLabel}
          onClick={() => {
            toggleSidebar();
          }}
          color="primary"
          size="s"
          fullWidth={false}
          minWidth={0}
          iconType={RobotIcon}
        >
          <FormattedMessage
            id="xpack.agentBuilder.navControl.linkLabel"
            defaultMessage="AI Agent"
          />
        </AgentBuilderButton>
      </EuiToolTip>
    </>
  );
}

const buttonLabel = i18n.translate(
  'xpack.agentBuilder.navControl.openTheAgentBuilderSidebarLabel',
  {
    defaultMessage: 'Open Agent Builder',
  }
);

const shortcutLabel = i18n.translate('xpack.agentBuilder.navControl.keyboardShortcutTooltip', {
  values: { keyboardShortcut: isMac ? '⌘ ;' : 'Ctrl ;' },
  defaultMessage: '(Keyboard shortcut {keyboardShortcut})',
});
