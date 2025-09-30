/* eslint-disable @elastic/eui/no-css-color */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiToolTip,
  EuiButton,
  EuiIcon,
  EuiButtonEmpty,
  EuiButtonIcon,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { useAssistantContext } from '../..';
import { SparklesAnim, sparklesMaskDataUri } from './assets/sparkles_anim';
import { SparklesWhite } from './assets/sparkles_white';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

const TOOLTIP_CONTENT = i18n.translate(
  'xpack.elasticAssistant.assistantContext.assistantNavLinkShortcutTooltip',
  {
    values: { keyboardShortcut: isMac ? '⌘ ;' : 'Ctrl ;' },
    defaultMessage: 'Keyboard shortcut {keyboardShortcut}',
  }
);

const LINK_LABEL = i18n.translate('xpack.elasticAssistant.assistantContext.assistantNavLink', {
  defaultMessage: 'Elastic Agent',
});

interface AssistantNavLinkProps {
  iconOnly?: boolean;
  variant?: 'primary' | 'secondary' | 'tertiary';
}

/** One gradient to rule them all */
const CTA_GRAD = `linear-gradient(20deg, #0B64DD 10%, #1C9BEF 60%, #48EFCF 100%)`;
const CTA_GRAD_EXT = `linear-gradient(
  20deg,
  #0b64dd 0%,
  #186fe3 12%,
  #1c9bef 28%,
  #28a8f0 44%,
  #33b4f1 54%,
  #39c4e6 64%,
  #3fd4dc 72%,
  #48efcf 82%,
  #39e1c9 91%,
  #2ccfcd 100%
)`;
const CTA_GRAD_ALTERNATE = `linear-gradient(120deg, #6a11cb 0%, #8e3edb 20%, #b145da 55%, #ff0080 85%, #ff0080 100%)`;
const CTA_GRAD_ALTERNATE_2 = `linear-gradient(
  60deg,
  hsl(224, 85%, 66%),
  hsl(269, 85%, 66%),
  hsl(314, 85%, 66%),
  hsl(359, 85%, 66%),
  hsl(44, 85%, 66%),
  hsl(89, 85%, 66%),
  hsl(134, 85%, 66%),
  hsl(179, 85%, 66%)
  )`;

export const AssistantNavLink: FC<AssistantNavLinkProps> = ({
  iconOnly = false,
  variant = 'primary',
}) => {
  const { chrome, showAssistantOverlay, assistantAvailability } = useAssistantContext();
  const { euiTheme } = useEuiTheme();
  const [chromeStyle, setChromeStyle] = useState<ChromeStyle | undefined>(undefined);

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

  const EuiButtonBasicOrEmpty =
    chromeStyle === 'project' ? (variant === 'secondary' ? EuiButton : EuiButtonEmpty) : EuiButton;

  // Choose the right icon based on variant

  /** Base styles shared by all variants */
  const base = css`
    --cta-grad: ${CTA_GRAD};
    --cta-grad-ext: ${CTA_GRAD_EXT};
    --cta-grad-alternate: ${CTA_GRAD_ALTERNATE};
    --cta-grad-alternate-2: ${CTA_GRAD_ALTERNATE_2};

    background: transparent !important;
    --border-width: 1px;

    position: relative;
    display: flex;
    gap: 8px;
    justify-content: center;
    align-items: center;
    padding-inline: 8px;
    height: 28px;
    min-width: 28px;
    color: ${chromeStyle === 'project' ? '#8e3edb' : 'white'};
    // background: #222;
    border-radius: 4px;

    &::after {
      background: var(--cta-grad-alternate);
      position: absolute;
      content: '';
      z-index: -1;
      width: calc(100% + var(--border-width) * 2);
      height: calc(100% + var(--border-width) * 2);

      background-size: 200% 200%;
      background-position: 0 40%;
      border-radius: 5px;
    }

    &:hover {
      &::after,
      > span {
        animation: moveGradientIn 2s alternate infinite;
      }
    }

    &:focus-visible {
      box-shadow: 0 0 0 2px ${euiTheme.colors.primary};
    }

    @keyframes moveGradientIn {
      0% {
        background-position: 0% 40%;
      }
      100% {
        background-position: 100% 0%;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `;

  /** Primary (filled) */
  const primary = css`
    color: white !important;
  `;

  /** Secondary (outlined): gradient border + gradient text/icon */
  const secondary = css`
    background: ${chromeStyle === 'project'
      ? euiTheme.colors.backgroundBasePlain
      : '#0b1628'} !important;

    &::after {
      background: var(--cta-grad-alternate);
      position: absolute;
      content: '';
      top: calc(-1 * var(--border-width));
      left: calc(-1 * var(--border-width));
      z-index: -1;
      width: calc(100% + var(--border-width) * 2);
      height: calc(100% + var(--border-width) * 2);

      background-size: 200% 200%;
      background-position: 0 40%;
      border-radius: 5px;
      // animation: pause;
    }

    > span {
      background-image: ${chromeStyle === 'classic'
        ? 'none'
        : 'var(--cta-grad-alternate)'} !important;
      background-color: ${chromeStyle === 'classic' ? '#fff' : 'transparent'} !important;
      background-size: 200% 200%;
      background-position: 0% 40%;
      -webkit-background-clip: text !important;
      background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
      color: transparent !important;
    }
  `;

  /** Tertiary (minimal): no background/border + gradient text/icon */
  const tertiary = css`
    background: transparent !important;

    &::after {
      background: transparent;
      background-position: 0% 40%;
      position: absolute;
      content: '';
      top: 0;
      left: 0;
      z-index: -1;
      width: 100%;
      height: 100%;

      border-radius: 5px;
      // animation: pause;
    }

    &:hover {
      &::after {
        background: ${euiTheme.colors.backgroundBaseInteractiveHover};
      }
    }

    > span {
      background-image: ${chromeStyle === 'classic'
        ? 'none'
        : 'var(--cta-grad-alternate)'} !important;
      background-color: ${chromeStyle === 'classic' ? '#fff' : 'transparent'} !important;
      background-size: 200% 200%;
      background-position: 0% 40%;
      -webkit-background-clip: text !important;
      background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
      color: transparent !important;
    }
  `;




  return (
    <EuiToolTip delay="long" content={TOOLTIP_CONTENT}>
      <button
        type="button"
        onClick={showOverlay}
        // size="s"
        // color="text" /* we fully control visuals via CSS */
        // display={iconOnly ? 'empty' : undefined}
        // iconType={IconComponent} /* conditional icon: gradient for project, white for classic */
        data-test-subj="assistantNavLink"
        aria-label={iconOnly ? LINK_LABEL : undefined}
        css={[
          base,
          variant === 'primary'
            ? primary
            : variant === 'secondary'
            ? secondary
            : variant === 'tertiary'
            ? tertiary
            : '',
        ]}
      >
        <EuiIcon
          type={
            variant === 'primary'
              ? 'sparkles'
              : chromeStyle === 'project'
              ? SparklesAnim
              : 'sparkles'
          }
          // type={SparklesAnim}
          size="m"
          css={{
            fill: chromeStyle === 'project' ? '#0fb1628' : euiTheme.colors.backgroundBasePlain,
          }}
        />
        {!iconOnly && <span>{LINK_LABEL}</span>}
      </button>
    </EuiToolTip>
  );
};
