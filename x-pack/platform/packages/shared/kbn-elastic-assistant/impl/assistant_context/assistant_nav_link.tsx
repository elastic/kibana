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
  const ButtonComponent = iconOnly ? EuiButtonIcon : EuiButtonBasicOrEmpty;

  // Choose the right icon based on variant
  const IconComponent = variant === 'primary' ? SparklesWhite : SparklesAnim;

  /** Base styles shared by all variants */
  const base = css`
    --cta-grad: ${CTA_GRAD};

    @keyframes gradientShift {
      0% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 0% 100%;
      }
      100% {
        background-position: 0% 50%;
      }
    }

    @keyframes angleSpin {
      to {
        --a: 380deg;
      }
    } /* 20 + 360 */

    @keyframes spinConic {
      to {
        --a: 360;
      }
    }

    @keyframes moveGradient {
      0% {
        background-position: 0% 40%;
      }
      100% {
        background-position: 100% 0%;
      }
    }

    .euiButtonContent {
      gap: ${euiTheme.size.s};
      align-items: center;
    }

    /* Make sure the icon element can be masked/painted */
    .euiButtonContent__icon {
      width: 18px;
      height: 18px;
      position: relative;

      /* Paint the shared gradient into the icon silhouette via CSS mask */
      background-image: var(--cta-grad);
      -webkit-mask: ${sparklesMaskDataUri} no-repeat center / 100% 100%;
      mask: ${sparklesMaskDataUri} no-repeat center / 100% 100%;
    }

    /* Hide the inline SVG’s own paint (we use it as size/a11y only) */
    .euiButtonContent__icon .euiIcon {
      visibility: hidden;
    }

    /* Motion-safe hover */
    transition: filter 160ms ease, transform 120ms ease;
    &:active {
      transform: translateY(0.5px);
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `;

  /** Primary (filled) */
  const primary = css`
    color: ${euiTheme.colors.ghost}; /* white text/icon */
    background-image: var(--cta-grad);
    border: none;

    /* White icon for primary variant (handled by SparklesWhite component) */

    &:hover {
      filter: brightness(1.05);
    }
    &:focus-visible {
      outline: 2px solid ${euiTheme.colors.primary};
      outline-offset: 2px;
    }
  `;

  /** Secondary (outlined): gradient border + gradient text/icon */
  const secondary = css`
    background: ${chromeStyle === 'project'
      ? euiTheme.colors.backgroundBasePlain
      : '#0b1628'} !important;
    --border-width: 1px;

    position: relative;
    display: flex;
    gap: 8px;
    justify-content: center;
    align-items: center;
    // padding-inline: 8px;
    height: 28px;
    width: 28px;
    color: white;
    // background: #222;
    border-radius: 4px;

    &::after {
      position: absolute;
      content: '';
      top: calc(-1 * var(--border-width));
      left: calc(-1 * var(--border-width));
      z-index: -1;
      width: calc(100% + var(--border-width) * 2);
      height: calc(100% + var(--border-width) * 2);
      // background: linear-gradient(
      //   60deg,
      //   hsl(224, 85%, 66%),
      //   hsl(269, 85%, 66%),
      //   hsl(314, 85%, 66%),
      //   hsl(359, 85%, 66%),
      //   hsl(44, 85%, 66%),
      //   hsl(89, 85%, 66%),
      //   hsl(134, 85%, 66%),
      //   hsl(179, 85%, 66%)
      // );
      // background: linear-gradient(20deg, #0b64dd 10%, #1c9bef 60%, #48efcf 100%);
      //       background: linear-gradient(
      //   20deg,
      //   /* Deep blue cluster */
      //   #0b64dd 0%,
      //   #186fe3 12%,

      //   /* Light blue cluster */
      //   #1c9bef 28%,
      //   #28a8f0 44%,

      //   /* Aqua bridge */
      //   #33b4f1 54%,
      //   #39c4e6 64%,

      //   /* Teal cluster (expanded range) */
      //   #3fd4dc 72%,
      //   #48efcf 82%,
      //   #39e1c9 91%,
      //   #2ccfcd 100%
      // );
      background: linear-gradient(
        120deg,
        #6a11cb 0%,
        #8e3edb 15%,
        #b145da 45%,
        #ff0080 70%,
        #ff0080 100%
      );

      background-size: 200% 200%;
      background-position: 0 40%;
      border-radius: 5px;
      animation: pause;
    }

    &:hover {
      &::after {
        animation: moveGradient 2s alternate infinite;
      }
    }

    /* Apply gradient text to the direct child span element */
    > span {
      background: var(--cta-grad) !important;
      -webkit-background-clip: text !important;
      background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
      color: transparent !important;
    }

    /* Apply gradient to all children except icon (which uses CSS mask) */
    *:not(.euiButtonContent__icon) {
      background: var(--cta-grad) !important;
      -webkit-background-clip: text !important;
      background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
      color: transparent !important;
    }

    &:focus-visible {
      box-shadow: 0 0 0 2px ${euiTheme.colors.primary};
    }
  `;

  /** Tertiary (minimal): no background/border + gradient text/icon */
  const tertiary = css`
    background: transparent !important;
    border: none !important;

    /* Apply gradient to button and all children - same as secondary */
    background: var(--cta-grad) !important;
    -webkit-background-clip: text !important;
    background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    color: transparent !important;

    /* Apply gradient to all children except icon (which uses CSS mask) */
    *:not(.euiButtonContent__icon) {
      background: var(--cta-grad) !important;
      -webkit-background-clip: text !important;
      background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
      color: transparent !important;
    }

    &:hover {
      filter: brightness(1.05);
    }
    &:focus-visible {
      box-shadow: 0 0 0 2px ${euiTheme.colors.primary}33;
    }
  `;

  /** Icon-only Primary: gradient background + white sparkles */
  const iconOnlyPrimary = css`
    background: var(--cta-grad) !important;
    border: none;
    width: ${euiTheme.size.xl};
    height: ${euiTheme.size.xl};
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
      filter: brightness(1.05);
    }
  `;

  /** Icon-only Secondary: transparent background + gradient border + gradient sparkles */
  const iconOnlySecondary = css`
    background: transparent !important;
    border: 2px solid var(--cta-grad) !important;
    width: ${euiTheme.size.xl};
    height: ${euiTheme.size.xl};
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
      filter: brightness(1.03);
    }
  `;

  /** Icon-only Tertiary: no background/border + gradient sparkles */
  const iconOnlyTertiary = css`
    background: transparent !important;
    border: none !important;
    width: ${euiTheme.size.xl};
    height: ${euiTheme.size.xl};
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
      filter: brightness(1.05);
    }
  `;

  return (
    <EuiToolTip delay="long" content={TOOLTIP_CONTENT}>
      <button
        onClick={showOverlay}
        // size="s"
        // color="text" /* we fully control visuals via CSS */
        // display={iconOnly ? 'empty' : undefined}
        // iconType={IconComponent} /* conditional icon: gradient for project, white for classic */
        data-test-subj="assistantNavLink"
        aria-label={iconOnly ? LINK_LABEL : undefined}
        css={[
          base,
          iconOnly
            ? variant === 'primary'
              ? iconOnlyPrimary
              : variant === 'secondary'
              ? iconOnlySecondary
              : iconOnlyTertiary
            : variant === 'primary'
            ? primary
            : variant === 'secondary'
            ? secondary
            : tertiary,
        ]}
      >
        <EuiIcon
          type={SparklesAnim}
          css={{
            fill: chromeStyle === 'project' ? '#0b1628' : euiTheme.colors.backgroundBasePlain,
          }}
        />
        {/* {!iconOnly && LINK_LABEL} */}
      </button>
    </EuiToolTip>
  );
};
