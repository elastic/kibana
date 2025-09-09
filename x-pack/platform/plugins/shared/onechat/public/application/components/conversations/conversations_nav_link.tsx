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
import { useKibana } from '../../hooks/use_kibana';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

const TOOLTIP_CONTENT = i18n.translate('xpack.onechat.conversationsNavLink.shortcutTooltip', {
  values: { keyboardShortcut: isMac ? '⌘ ;' : 'Ctrl ;' },
  defaultMessage: 'Keyboard shortcut {keyboardShortcut}',
});
const LINK_LABEL = i18n.translate('xpack.onechat.conversationsNavLink.label', {
  defaultMessage: 'One Chat',
});

export interface ConversationsNavLinkProps {
  onOpenFlyout: () => void;
  hasAssistantPrivilege?: boolean;
}

export const ConversationsNavLink: FC<ConversationsNavLinkProps> = ({
  onOpenFlyout,
  hasAssistantPrivilege = true,
}) => {
  const {
    services: { chrome },
  } = useKibana();
  const [chromeStyle, setChromeStyle] = useState<ChromeStyle | undefined>(undefined);

  // useObserverable would change the order of re-renders that are tested against closely.
  useEffect(() => {
    const s = chrome.getChromeStyle$().subscribe(setChromeStyle);
    return () => s.unsubscribe();
  }, [chrome]);

  const showOverlay = useCallback(() => {
    onOpenFlyout();
  }, [onOpenFlyout]);

  if (!hasAssistantPrivilege || !chromeStyle) {
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
        data-test-subj="conversationsNavLink"
      >
        {LINK_LABEL}
      </EuiButtonBasicOrEmpty>
    </EuiToolTip>
  );
};

ConversationsNavLink.displayName = 'ConversationsNavLink';
