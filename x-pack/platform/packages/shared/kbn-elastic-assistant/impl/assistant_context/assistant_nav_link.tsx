/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps, FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';

import { EuiButton, EuiButtonEmpty, EuiButtonIcon, EuiShowFor, EuiToolTip } from '@elastic/eui';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { AIAssistantType } from '@kbn/ai-assistant-management-plugin/public';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';
import { useAssistantContext } from '../..';

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
    const sub = openChatTrigger$.subscribe((selection) => {
      if (selection === AIAssistantType.Security) {
        showOverlay();
        completeOpenChat?.();
      }
    });
    return () => sub.unsubscribe();
  }, [completeOpenChat, openChatTrigger$, showOverlay]);

  if (!assistantAvailability.hasAssistantPrivilege || !chromeStyle) {
    return null;
  }

  const AiAssistantButton: React.FC<
    ComponentProps<typeof EuiButton> & ComponentProps<typeof EuiButtonIcon>
  > = (props) => (
    <>
      <EuiShowFor sizes={['m', 'l', 'xl']}>
        {chromeStyle === 'project' ? (
          <EuiButtonEmpty {...props} data-test-subj="assistantNavLink" />
        ) : (
          <EuiButton {...props} data-test-subj="assistantNavLink" />
        )}
      </EuiShowFor>
      <EuiShowFor sizes={['xs', 's']}>
        <EuiButtonIcon
          {...props}
          data-test-subj="assistantNavLinkButtonIcon"
          display={chromeStyle === 'project' ? 'empty' : 'base'}
        />
      </EuiShowFor>
    </>
  );

  return (
    <EuiToolTip content={TOOLTIP_CONTENT}>
      <AiAssistantButton onClick={showOverlay} color="primary" size="s" iconType={AssistantIcon}>
        {LINK_LABEL}
      </AiAssistantButton>
    </EuiToolTip>
  );
};
