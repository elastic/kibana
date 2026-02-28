/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ChromeHeaderAppActionsConfig } from '@kbn/core-chrome-browser';

const noop = () => {};

/**
 * Header app actions config for the Rules app (Stack Management > Rules).
 * POC: all actions are dumb (onClick: noop). Set when app mounts; platform clears on app change.
 * - Secondary: New (icon-only), Overflow (•••) with Settings, Docs, Feedback.
 */
export function getRulesHeaderAppActionsConfig(): ChromeHeaderAppActionsConfig {
  return {
    secondaryActions: [
      <EuiButtonIcon
        key="rules-new"
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
    overflowPanels: [
      {
        id: 0,
        title: '',
        items: [
          {
            name: i18n.translate('xpack.triggersActionsUI.rulesSettings.link.title', {
              defaultMessage: 'Settings',
            }),
            icon: 'gear',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.triggersActionsUI.home.docsLinkText', {
              defaultMessage: 'Documentation',
            }),
            icon: 'question',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.triggersActionsUI.headerAppActions.overflow.giveFeedback', {
              defaultMessage: 'Feedback',
            }),
            icon: 'comment',
            onClick: noop,
          },
        ],
      },
    ],
    primaryActions: [],
  };
}
