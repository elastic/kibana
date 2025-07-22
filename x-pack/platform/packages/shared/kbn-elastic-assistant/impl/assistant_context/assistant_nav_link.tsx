/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { EuiToolTip, EuiButton, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChromeStyle } from '@kbn/core-chrome-browser';
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
  const { chrome, showAssistantOverlay, assistantAvailability } = useAssistantContext();
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
        data-test-subj="assistantNavLink"
      >
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <AssistantIcon size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{LINK_LABEL}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiButtonBasicOrEmpty>
    </EuiToolTip>
  );
};
