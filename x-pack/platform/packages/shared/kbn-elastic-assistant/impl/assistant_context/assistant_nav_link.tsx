/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { EuiToolTip, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { AIChatExperience } from '@kbn/ai-assistant-management-plugin/public';
import { AssistantIcon, RobotIcon } from '@kbn/ai-assistant-icon';
import { useAssistantContext } from '../..';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

const TOOLTIP_CONTENT = i18n.translate(
  'xpack.elasticAssistant.assistantContext.assistantNavLinkShortcutTooltip',
  {
    values: { keyboardShortcut: isMac ? '⌘ ;' : 'Ctrl ;' },
    defaultMessage: 'Keyboard shortcut {keyboardShortcut}',
  }
);
const LINK_LABEL = i18n.translate('xpack.elasticAssistant.assistantContext.assistantNavLink', {
  defaultMessage: 'AI Assistant',
});

const AGENT_TOOLTIP_CONTENT = i18n.translate(
  'xpack.elasticAssistant.assistantContext.agentNavLinkTooltip',
  {
    defaultMessage: 'AI Agent functionality will be available soon',
  }
);
const AGENT_LINK_LABEL = i18n.translate('xpack.elasticAssistant.assistantContext.agentNavLink', {
  defaultMessage: 'AI Agent',
});

export const AssistantNavLink: FC = () => {
  const {
    chrome,
    showAssistantOverlay,
    assistantAvailability,
    openChatTrigger$,
    completeOpenChat,
    chatExperience$,
  } = useAssistantContext();
  const [chromeStyle, setChromeStyle] = useState<ChromeStyle | undefined>(undefined);
  const [currentChatExperience, setCurrentChatExperience] = useState<AIChatExperience>(
    AIChatExperience.Classic
  );

  // useObserverable would change the order of re-renders that are tested against closely.
  useEffect(() => {
    const s = chrome.getChromeStyle$().subscribe(setChromeStyle);
    return () => s.unsubscribe();
  }, [chrome]);

  const showOverlay = useCallback(
    () => showAssistantOverlay({ showOverlay: true }),
    [showAssistantOverlay]
  );

  // Subscribe to chatExperience$ to detect changes from GenAI Settings
  useEffect(() => {
    if (!chatExperience$) return;
    const sub = chatExperience$.subscribe((experience: AIChatExperience) => {
      setCurrentChatExperience(experience);
    });
    return () => sub.unsubscribe();
  }, [chatExperience$]);

  // Subscribe to openChatTrigger$ for selection modal flow
  useEffect(() => {
    if (!openChatTrigger$) return;
    const sub = openChatTrigger$.subscribe((event) => {
      if (event.chatExperience === AIChatExperience.Agents) {
        setCurrentChatExperience(AIChatExperience.Agents);
        showOverlay();
        completeOpenChat?.();
      } else if (event.assistant === 'security') {
        setCurrentChatExperience(AIChatExperience.Classic);
        showOverlay();
        completeOpenChat?.();
      }
    });
    return () => sub.unsubscribe();
  }, [completeOpenChat, openChatTrigger$, showOverlay]);

  // TODO: Should we check for AgentsAvailability separately?
  // For now only check privileges in Classic mode, not Agent mode
  if (
    currentChatExperience === AIChatExperience.Classic &&
    (!assistantAvailability.hasAssistantPrivilege || !chromeStyle)
  ) {
    return null;
  }

  const EuiButtonBasicOrEmpty = chromeStyle === 'project' ? EuiButtonEmpty : EuiButton;

  // TODO: Placeholder! Implement agent mode when available
  return currentChatExperience === AIChatExperience.Agents ? (
    <EuiToolTip content={AGENT_TOOLTIP_CONTENT}>
      <EuiButtonBasicOrEmpty
        onClick={undefined}
        color="primary"
        size="s"
        iconType={RobotIcon}
        data-test-subj="agentNavLink"
        disabled={false}
      >
        {AGENT_LINK_LABEL}
      </EuiButtonBasicOrEmpty>
    </EuiToolTip>
  ) : (
    <EuiToolTip content={TOOLTIP_CONTENT}>
      <EuiButtonBasicOrEmpty
        onClick={showOverlay}
        color="primary"
        size="s"
        iconType={AssistantIcon}
        data-test-subj="assistantNavLink"
        disabled={false}
      >
        {LINK_LABEL}
      </EuiButtonBasicOrEmpty>
    </EuiToolTip>
  );
};
