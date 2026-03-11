/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useRef } from 'react';

import { EuiShowFor, EuiToolTip } from '@elastic/eui';
import { AIAssistantType } from '@kbn/ai-assistant-management-plugin/public';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { useAssistantContext } from '../..';

const SHORTCUT_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistantContext.assistantNavLinkShortcutTooltip',
  {
    values: { keyboardShortcut: isMac ? '⌘ ;' : 'Ctrl ;' },
    defaultMessage: 'Keyboard shortcut {keyboardShortcut}',
  }
);

const OPEN_LABEL = i18n.translate('xpack.elasticAssistant.assistantContext.openAIAssistantLabel', {
  defaultMessage: 'Open the AI Assistant',
});

const LINK_LABEL = i18n.translate('xpack.elasticAssistant.assistantContext.assistantNavLink', {
  defaultMessage: 'AI Assistant',
});

const FULL_TOOLTIP_CONTENT = (
  <div style={{ textAlign: 'center' }}>
    <span>{OPEN_LABEL}</span>
    <br />
    <span>{SHORTCUT_LABEL}</span>
  </div>
);

export const AssistantNavLink: FC = () => {
  const {
    showAssistantOverlay,
    assistantAvailability,
    openChatTrigger$,
    completeOpenChat,
    isOverlayOpen,
  } = useAssistantContext();
  const tooltipRef = useRef<EuiToolTip>(null);

  const handleTooltipMouseOut = useCallback(() => {
    tooltipRef.current?.hideToolTip();
  }, []);

  const toggleOverlay = useCallback(() => {
    tooltipRef.current?.hideToolTip();
    showAssistantOverlay({ showOverlay: !isOverlayOpen });
  }, [showAssistantOverlay, isOverlayOpen]);

  const openOverlay = useCallback(() => {
    showAssistantOverlay({ showOverlay: true });
  }, [showAssistantOverlay]);

  useEffect(() => {
    if (!openChatTrigger$) return;
    const sub = openChatTrigger$.subscribe((selection) => {
      if (selection === AIAssistantType.Security) {
        openOverlay();
        completeOpenChat?.();
      }
    });
    return () => sub.unsubscribe();
  }, [completeOpenChat, openChatTrigger$, openOverlay]);

  if (!assistantAvailability.hasAssistantPrivilege) {
    return null;
  }

  const variant = isOverlayOpen ? 'accent' : 'base';

  return (
    <>
      <EuiShowFor sizes={['m', 'l', 'xl']}>
        <EuiToolTip content={SHORTCUT_LABEL} ref={tooltipRef} onMouseOut={handleTooltipMouseOut}>
          <AiButton
            variant={variant}
            size="s"
            iconType="aiAssistantLogo"
            onClick={toggleOverlay}
            data-test-subj="assistantNavLink"
          >
            {LINK_LABEL}
          </AiButton>
        </EuiToolTip>
      </EuiShowFor>

      <EuiShowFor sizes={['xs', 's']}>
        <EuiToolTip
          content={FULL_TOOLTIP_CONTENT}
          ref={tooltipRef}
          onMouseOut={handleTooltipMouseOut}
        >
          <AiButton
            iconOnly
            variant={variant}
            size="s"
            iconType="aiAssistantLogo"
            onClick={toggleOverlay}
            aria-label={OPEN_LABEL}
            data-test-subj="assistantNavLinkButtonIcon"
          />
        </EuiToolTip>
      </EuiShowFor>
    </>
  );
};
