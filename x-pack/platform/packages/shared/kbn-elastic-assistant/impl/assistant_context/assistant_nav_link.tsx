/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { EuiToolTip, EuiButton, EuiButtonEmpty, EuiButtonIcon, useEuiTheme } from '@elastic/eui';
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
}

/** One gradient to rule them all */
const CTA_GRAD = `linear-gradient(20deg, #0B64DD 10%, #1C9BEF 60%, #48EFCF 100%)`;

export const AssistantNavLink: FC<AssistantNavLinkProps> = ({ iconOnly = false }) => {
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

  const EuiButtonBasicOrEmpty = EuiButtonEmpty; // Force project mode for testing
  // const EuiButtonBasicOrEmpty = chromeStyle === 'project' ? EuiButtonEmpty : EuiButton;
  const ButtonComponent = iconOnly ? EuiButtonIcon : EuiButtonBasicOrEmpty;
  
  // Choose the right icon based on chrome style (not iconOnly)
  const IconComponent = chromeStyle === 'project' ? SparklesAnim : SparklesWhite;

  /** Base styles shared by all variants */
  const base = css`
    --cta-grad: ${CTA_GRAD};

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
    /* Simple test: transparent background, gradient text */
    background: transparent !important;
    border: 2px solid var(--cta-grad) !important;
    
    /* Apply gradient to button and all children - this approach worked before */
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
      filter: brightness(1.03);
    }
    &:focus-visible {
      box-shadow: 0 0 0 2px ${euiTheme.colors.primary}33;
    }
  `;

  /** Icon-only: gradient background for classic chrome, transparent for project chrome */
  const iconOnlyCss = css`
    background: ${chromeStyle === 'project' ? 'transparent' : 'var(--cta-grad)'} !important;
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

  return (
    <EuiToolTip delay="long" content={TOOLTIP_CONTENT}>
      <ButtonComponent
        onClick={showOverlay}
        size="s"
        color="text" /* we fully control visuals via CSS */
        display={iconOnly ? 'empty' : undefined}
        iconType={IconComponent} /* conditional icon: gradient for project, white for classic */
        data-test-subj="assistantNavLink"
        aria-label={iconOnly ? LINK_LABEL : undefined}
        css={[
          base,
          iconOnly
            ? iconOnlyCss
            : secondary // Force secondary variant for testing
            // : chromeStyle === 'project'
            // ? secondary // EuiButtonEmpty → outlined look
            // : primary, // EuiButton → filled look
        ]}
      >
        {!iconOnly && LINK_LABEL}
      </ButtonComponent>
    </EuiToolTip>
  );
};
