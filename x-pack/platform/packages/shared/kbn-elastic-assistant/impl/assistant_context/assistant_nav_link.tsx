/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useRef, useState } from 'react';

import { EuiShowFor, EuiToolTip, type EuiToolTipRef } from '@elastic/eui';
import { AIAssistantType } from '@kbn/ai-assistant-management-plugin/public';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';
import { AiButton } from '@kbn/shared-ux-ai-components';
import type { HotkeysStart } from '@kbn/core-hotkeys-browser';
import { useAssistantContext } from '../..';

const SHORTCUT_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistantContext.assistantNavLinkShortcutTooltip',
  {
    values: { keyboardShortcut: isMac ? '⌘ ;' : 'Ctrl+;' },
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

interface AssistantNavLinkProps {
  hotkeys: HotkeysStart;
}

export const AssistantNavLink: FC<AssistantNavLinkProps> = ({ hotkeys }) => {
  const {
    showAssistantOverlay,
    assistantAvailability,
    openChatTrigger$,
    completeOpenChat,
    isOverlayOpen,
  } = useAssistantContext();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<EuiToolTipRef>(null);
  const [tooltipVisible, setTooltipVisible] = useState(true);

  useEffect(() => {
    const handle = hotkeys.register(
      {
        id: 'elasticAssistant:toggleOverlay',
        keys: 'Mod+;',
        scope: 'global',
        label: i18n.translate(
          'xpack.elasticAssistant.assistantContext.toggleOverlayShortcutLabel',
          { defaultMessage: 'Open or close the AI Assistant' }
        ),
      },
      (event) => {
        event.preventDefault();
        showAssistantOverlay({ showOverlay: !isOverlayOpen });
      }
    );
    return handle.unregister;
  }, [hotkeys, showAssistantOverlay, isOverlayOpen]);

  useEffect(() => {
    if (!isOverlayOpen) return;
    const handle = hotkeys.register(
      {
        id: 'elasticAssistant:closeOverlay',
        keys: 'Escape',
        scope: 'context',
        label: i18n.translate('xpack.elasticAssistant.assistantContext.closeOverlayShortcutLabel', {
          defaultMessage: 'Close the AI Assistant',
        }),
      },
      () => {
        setTooltipVisible(true);
        buttonRef.current?.focus();
      }
    );
    return handle.unregister;
  }, [hotkeys, isOverlayOpen]);

  useEffect(() => {
    if (!openChatTrigger$) return;
    const sub = openChatTrigger$.subscribe((selection) => {
      if (selection === AIAssistantType.Security) {
        showAssistantOverlay({ showOverlay: true });
        completeOpenChat?.();
      }
    });
    return () => sub.unsubscribe();
  }, [completeOpenChat, openChatTrigger$, showAssistantOverlay]);

  if (!assistantAvailability.hasAssistantPrivilege) {
    return null;
  }

  const handleClick = () => {
    tooltipRef.current?.hideToolTip();
    setTooltipVisible(false);
    showAssistantOverlay({ showOverlay: !isOverlayOpen });
  };

  const showTooltip = !isOverlayOpen && tooltipVisible;
  const variant = isOverlayOpen ? 'accent' : 'base';

  const textButton = (
    <AiButton
      buttonRef={buttonRef}
      variant={variant}
      size="s"
      iconType="aiAssistantLogo"
      onClick={handleClick}
      onMouseLeave={() => setTooltipVisible(true)}
      onBlur={() => setTooltipVisible(true)}
      data-test-subj="assistantNavLink"
    >
      {LINK_LABEL}
    </AiButton>
  );

  const iconButton = (
    <AiButton
      buttonRef={buttonRef}
      iconOnly
      variant={variant}
      size="s"
      iconType="aiAssistantLogo"
      onClick={handleClick}
      onMouseLeave={() => setTooltipVisible(true)}
      onBlur={() => setTooltipVisible(true)}
      aria-label={OPEN_LABEL}
      data-test-subj="assistantNavLinkButtonIcon"
    />
  );

  return (
    <>
      <EuiShowFor sizes={['m', 'l', 'xl']}>
        {showTooltip ? (
          <EuiToolTip content={SHORTCUT_LABEL} ref={tooltipRef}>
            {textButton}
          </EuiToolTip>
        ) : (
          textButton
        )}
      </EuiShowFor>

      <EuiShowFor sizes={['xs', 's']}>
        {showTooltip ? (
          <EuiToolTip content={FULL_TOOLTIP_CONTENT} ref={tooltipRef}>
            {iconButton}
          </EuiToolTip>
        ) : (
          iconButton
        )}
      </EuiShowFor>
    </>
  );
};
