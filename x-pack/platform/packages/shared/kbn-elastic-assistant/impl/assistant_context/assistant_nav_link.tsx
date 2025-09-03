/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { EuiToolTip, EuiButton, EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
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
  const { chrome, showAssistantOverlay, assistantAvailability } = useAssistantContext();
  const { euiTheme } = useEuiTheme();
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
    <EuiToolTip delay="long" content={TOOLTIP_CONTENT}>
      <div
        css={{
          position: 'relative',
          display: 'inline-block',
          overflow: 'hidden',
          marginTop: '4px',
          borderRadius: '4px', // Match EUI button border radius
          '&:hover > div:first-of-type': {
            transform: 'translateX(185px) translateY(85px) rotate(22deg)',
          },
        }}
      >
        <div
          css={{
            position: 'absolute',
            backgroundImage:
              'linear-gradient(-40deg, #61A2FF 18%,rgb(198, 133, 235) 33%,rgb(232, 101, 208) 52%,rgb(247, 120, 167) 70%)',
            height: '200px',
            width: '320px',
            top: '-140px',
            left: '-190px',
            borderRadius: '4px',
            zIndex: -1,
            transition: 'transform 0.8s ease',
            transform: 'translateX(0px)',
          }}
        />
        <EuiButtonBasicOrEmpty
          onClick={showOverlay}
          size="s"
          iconType={() => <AssistantIcon multicolor={false} />}
          data-test-subj="assistantNavLink"
          css={{
            position: 'relative',
            zIndex: 1,
            color: euiTheme.colors.ink,
            backgroundColor: 'transparent !important',
            overflow: 'hidden',
            '&:hover': {
              backgroundColor: 'transparent !important',
            },
            '&::before': {
              backgroundColor: 'transparent !important',
            },
          }}
        >
          {LINK_LABEL}
        </EuiButtonBasicOrEmpty>
      </div>
    </EuiToolTip>
  );
};
