/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, OverlayFlyoutOpenOptions } from '@kbn/core/public';
import ReactDOM from 'react-dom';
import { type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { openLazyFlyout } from '@kbn/presentation-util';

/** Default width for ES|QL inline flyouts. DSL panels keep `openLazyFlyout`'s 500px. */
export const LENS_ESQL_INLINE_FLYOUT_SIZE = 600;

/**
 * Shared logic to mount the inline config panel
 * @param ConfigPanel
 * @param coreStart
 * @param overlayTracker
 * @param uuid
 * @param container
 */

export const mountInlinePanel = async ({
  core,
  api,
  loadContent,
  options: { dataTestSubj, uuid, container, returnFocus, isEsql } = {},
}: {
  core: CoreStart;
  api?: unknown;
  loadContent: ({
    closeFlyout,
  }?: {
    closeFlyout: () => void;
  }) => Promise<JSX.Element | null | void>;
  uuid?: string;
  options?: {
    dataTestSubj?: string;
    uuid?: string;
    container?: HTMLElement | null;
    returnFocus?: () => void;
    isEsql?: boolean;
  };
}) => {
  if (container) {
    const component = await loadContent();
    if (!component) {
      throw new Error('Inline panel content is not available');
    }
    return ReactDOM.render(component, container);
  }
  openLazyFlyout({
    core,
    parentApi: api,
    returnFocus,
    loadContent,
    flyoutProps: {
      ...lensFlyoutProps,
      ...(isEsql ? { size: LENS_ESQL_INLINE_FLYOUT_SIZE } : {}),
      'data-test-subj': dataTestSubj ?? 'customizeLens',
      focusedPanelId: uuid,
    },
  });
};

/**
 * Flyout-root styles so drag-drop extra targets / ghosts can paint left of the panel.
 * Use Emotion `css` (not a raw string) so nested selectors are processed.
 * Ancestors above the body scroll node must not clip horizontally.
 */
const inlineFlyoutStyles = ({ euiTheme }: UseEuiTheme) => css`
  /* EUI styles.right ends with clip-path: polygon(-50%…); force clear */
  clip-path: none !important;
  overflow: visible !important;
  max-inline-size: 800px;
  min-inline-size: 256px;
  background: ${euiTheme.colors.backgroundBaseSubdued};

  /* EUI: .content:has(.euiFlyoutBody) { overflow-y/block: auto } — match + override longhands */
  .euiFlyout__content:has(.euiFlyoutBody),
  [data-test-subj='euiFlyoutContent']:has(.euiFlyoutBody) {
    overflow: visible !important;
    overflow-x: visible !important;
    overflow-y: visible !important;
    overflow-block: visible !important;
    overflow-inline: visible !important;
  }

  .kbnOverlayMountWrapper {
    overflow: visible !important;
    padding-left: 400px;
    margin-left: -400px;
    pointer-events: none;
    .euiFlyoutFooter {
      pointer-events: auto;
    }
  }

  .lnsEditFlyoutBody {
    overflow: visible !important;
  }

  .euiFlyoutBody__overflow {
    mask-image: none !important;
    -webkit-mask-image: none !important;
  }
`;

export const lensFlyoutProps: OverlayFlyoutOpenOptions = {
  css: inlineFlyoutStyles,
  'data-test-subj': 'customizeLens',
  isResizable: true,
  outsideClickCloses: true,
  // Close button lives in FlyoutWrapper so it can call the same onCancel as Cancel.
  hideCloseButton: true,
};
