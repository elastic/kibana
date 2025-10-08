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
import { AssistantIcon } from '@kbn/ai-assistant-icon';
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

export const AssistantNavLink: FC = () => {
  const {
    chrome,
    showAssistantOverlay,
    assistantAvailability,
    openChatTrigger$,
    completeOpenChat,
  } = useAssistantContext();
  const [chromeStyle, setChromeStyle] = useState<ChromeStyle | undefined>(undefined);

  // useObserverable would change the order of re-renders that are tested against closely.
  useEffect(() => {
    const s = chrome.getChromeStyle$().subscribe(setChromeStyle);
    return () => s.unsubscribe();
  }, [chrome]);

  const showOverlay = useCallback(
    () => showAssistantOverlay({ showOverlay: true }),
    [showAssistantOverlay]
  );

  useEffect(() => {
    if (!openChatTrigger$) return;
    const sub = openChatTrigger$.subscribe((event) => {
      if (event.assistant === 'security') {
        showOverlay();
        completeOpenChat?.();
      }
    });
    return () => sub.unsubscribe();
  }, [completeOpenChat, openChatTrigger$, showOverlay]);

  if (!assistantAvailability.hasAssistantPrivilege || !chromeStyle) {
    return null;
  }

  const EuiButtonBasicOrEmpty = chromeStyle === 'project' ? EuiButtonEmpty : EuiButton;

  return (
    <EuiToolTip content={TOOLTIP_CONTENT}>
      <EuiButtonBasicOrEmpty
        onClick={showOverlay}
        color="primary"
        size="s"
        iconType={AssistantIcon}
        data-test-subj="assistantNavLink"
      >
        {LINK_LABEL}
      </EuiButtonBasicOrEmpty>
    </EuiToolTip>
  );
};
