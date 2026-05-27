/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiShowFor, EuiToolTip, EuiWindowEvent, type EuiToolTipRef } from '@elastic/eui';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { isMac } from '@kbn/shared-ux-utility';
import type { ChromeStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart, AgentBuilderStartDependencies } from '../../types';
import { useUiPrivileges } from '../../application/hooks/use_ui_privileges';

const isSemicolon = (event: KeyboardEvent) => event.code === 'Semicolon' || event.key === ';';

interface AgentBuilderNavControlServices {
  agentBuilder: AgentBuilderPluginStart;
  aiAssistantManagementSelection: AgentBuilderStartDependencies['aiAssistantManagementSelection'];
  chrome: ChromeStart;
}

export function AgentBuilderNavControl() {
  const {
    services: { agentBuilder, aiAssistantManagementSelection, chrome },
  } = useKibana<AgentBuilderNavControlServices>();

  const { show: hasShowPrivilege } = useUiPrivileges();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<EuiToolTipRef>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(true);

  useEffect(() => {
    const sub = chrome.sidebar.getCurrentAppId$().subscribe((appId) => {
      const isOpen = appId === 'agentBuilder';
      setIsSidebarOpen((prev) => {
        if (prev && !isOpen) {
          setTooltipVisible(true);
          if (document.activeElement?.matches(':focus-visible')) {
            buttonRef.current?.focus();
          }
        }
        return isOpen;
      });
    });

    return () => sub.unsubscribe();
  }, [chrome.sidebar]);

  const handleClick = useCallback(() => {
    tooltipRef.current?.hideToolTip();
    setTooltipVisible(false);
    agentBuilder.toggleChat();
  }, [agentBuilder]);

  useEffect(() => {
    if (!hasShowPrivilege) {
      return;
    }

    const openChatSubscription = aiAssistantManagementSelection.openChat$.subscribe((selection) => {
      if (selection === AIChatExperience.Agent) {
        agentBuilder.openChat();
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
        handleClick();
      }
      if (event.key === 'Escape' && isSidebarOpen) {
        setTooltipVisible(true);
        buttonRef.current?.focus();
      }
    },
    [handleClick, isSidebarOpen]
  );

  if (!hasShowPrivilege) {
    return null;
  }

  const fullTooltipContent = (
    <div style={{ textAlign: 'center' }}>
      <span>{buttonLabel}</span>
      <br />
      <span>{shortcutLabel}</span>
    </div>
  );

  const showTooltip = !isSidebarOpen && tooltipVisible;
  const variant = isSidebarOpen ? 'accent' : 'base';
  const textButton = (
    <AiButton
      buttonRef={buttonRef}
      variant={variant}
      size="s"
      iconType="productAgent"
      onClick={handleClick}
      data-test-subj="AgentBuilderNavControlButton"
      onMouseLeave={() => setTooltipVisible(true)}
      onBlur={() => setTooltipVisible(true)}
    >
      <FormattedMessage id="xpack.agentBuilder.navControl.linkLabel" defaultMessage="AI Agent" />
    </AiButton>
  );
  const iconButton = (
    <AiButton
      buttonRef={buttonRef}
      iconOnly
      variant={variant}
      size="s"
      iconType="productAgent"
      onClick={handleClick}
      aria-label={buttonLabel}
      data-test-subj="AgentBuilderNavControlButtonIcon"
      onMouseLeave={() => setTooltipVisible(true)}
      onBlur={() => setTooltipVisible(true)}
    />
  );

  return (
    <>
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      <EuiShowFor sizes={['m', 'l', 'xl']}>
        {showTooltip ? (
          <EuiToolTip content={shortcutLabel} ref={tooltipRef}>
            {textButton}
          </EuiToolTip>
        ) : (
          textButton
        )}
      </EuiShowFor>

      <EuiShowFor sizes={['xs', 's']}>
        {showTooltip ? (
          <EuiToolTip content={fullTooltipContent} ref={tooltipRef}>
            {iconButton}
          </EuiToolTip>
        ) : (
          iconButton
        )}
      </EuiShowFor>
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
  defaultMessage: 'Keyboard shortcut {keyboardShortcut}',
});
