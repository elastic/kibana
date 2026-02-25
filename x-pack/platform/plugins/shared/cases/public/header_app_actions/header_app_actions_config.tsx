/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
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

const OverflowKeyPadSection: React.FC = () => (
  <>
    <EuiKeyPadMenu css={overflowKeyPadCss}>
      <EuiKeyPadMenuItem
        label={i18n.translate('core.ui.chrome.headerGlobalNav.newButton', { defaultMessage: 'New' })}
        onClick={noop}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowNew"
      >
        <EuiIcon type="plusInCircle" size="m" />
      </EuiKeyPadMenuItem>
      <EuiKeyPadMenuItem
        label={i18n.translate('core.ui.chrome.headerGlobalNav.favoriteButton', {
          defaultMessage: 'Favorite',
        })}
        onClick={noop}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowFavorite"
      >
        <EuiIcon type="star" size="m" />
      </EuiKeyPadMenuItem>
      <EuiKeyPadMenuItem
        label={i18n.translate('core.ui.chrome.headerGlobalNav.shareButton', {
          defaultMessage: 'Share',
        })}
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
 * Header app actions config for Cases (secondary New button + overflow with keypad + Settings).
 * Set when app mounts; platform clears on app change.
 */
export function getCasesHeaderAppActionsConfig(): ChromeHeaderAppActionsConfig {
  return {
    overflowPanels: [
      {
        id: 0,
        title: '',
        items: [
          { renderItem: () => <OverflowKeyPadSection />, key: 'keypad' },
          {
            name: i18n.translate('core.ui.chrome.headerGlobalNav.settingsButton', {
              defaultMessage: 'Settings',
            }),
            icon: 'gear',
            onClick: noop,
          },
        ],
      },
    ],
    secondaryActions: [
      <EuiButtonIcon
        key="new"
        size="xs"
        color="text"
        iconType="plusInCircle"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.newButton', {
          defaultMessage: 'New',
        })}
        data-test-subj="headerGlobalNav-appActionsNewButton"
      >
        {i18n.translate('core.ui.chrome.headerGlobalNav.newButton', { defaultMessage: 'New' })}
      </EuiButtonIcon>,
    ],
  };
}
