/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ChromeHeaderAppActionsConfig } from '@kbn/core-chrome-browser';

const noop = () => {};

const overflowKeyPadCss = css`
  justify-content: center;
  padding-block: 8px;
`;

const overflowKeyPadItemCss = css`
  width: 72px;
  height: 64px;
  min-width: 72px;
  min-height: 48px;
`;

const FleetOverflowKeyPadSection: React.FC = () => (
  <>
    <EuiKeyPadMenu css={overflowKeyPadCss}>
      <EuiKeyPadMenuItem
        label="New"
        onClick={noop}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowNew"
      >
        <EuiIcon type="plusInCircle" size="m" />
      </EuiKeyPadMenuItem>
      <EuiKeyPadMenuItem
        label="Favorite"
        onClick={noop}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowFavorite"
      >
        <EuiIcon type="star" size="m" />
      </EuiKeyPadMenuItem>
      <EuiKeyPadMenuItem
        label="Share"
        onClick={noop}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowShare"
      >
        <EuiIcon type="share" size="m" />
      </EuiKeyPadMenuItem>
    </EuiKeyPadMenu>
    <EuiHorizontalRule margin="none" />
  </>
);

/**
 * Header app actions config for the Fleet app (overflow panel + primary New button).
 * Set when app mounts; platform clears on app change.
 * Platform renders the overflow trigger automatically when overflowPanels are present.
 */
export function getFleetHeaderAppActionsConfig(): ChromeHeaderAppActionsConfig {
  return {
    overflowPanels: [
      {
        id: 0,
        title: '',
        items: [
          { renderItem: () => <FleetOverflowKeyPadSection />, key: 'keypad' },
          { name: 'Open', icon: 'folderOpen', onClick: noop },
          {
            renderItem: () => (
              <EuiContextMenuItem icon="share" onClick={noop} size="s">
                {i18n.translate('core.ui.chrome.headerGlobalNav.share', {
                  defaultMessage: 'Share',
                })}
              </EuiContextMenuItem>
            ),
            key: 'share',
          },
          { isSeparator: true as const, key: 'sep1' },
          { name: 'Export', icon: 'exportAction', onClick: noop },
          { name: 'Rename', icon: 'pencil', onClick: noop },
          { name: 'Settings', icon: 'gear', onClick: noop },
        ],
      },
    ],
    primaryActions: [
      <EuiButtonIcon
        key="fleet-new"
        size="xs"
        color="text"
        iconType="plusInCircle"
        onClick={noop}
        data-test-subj="headerGlobalNav-appActionsNewButton"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.newAriaLabel', {
          defaultMessage: 'New',
        })}
      />,
    ],
  };
}
