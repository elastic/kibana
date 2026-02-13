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

export interface StreamsHeaderAppActionsConfigDeps {
  onSettings: () => void;
  onCreateClassicStream: () => void;
}

/**
 * Header app actions config for the Streams app: overflow menu (Settings link)
 * and icon-only primary "New" button (create classic stream).
 */
export function getStreamsHeaderAppActionsConfig(
  deps: StreamsHeaderAppActionsConfigDeps
): ChromeHeaderAppActionsConfig {
  const { onSettings, onCreateClassicStream } = deps;

  return {
    overflowPanels: [
      {
        id: 0,
        title: '',
        items: [
          {
            name: i18n.translate('xpack.streams.headerAppActions.settings', {
              defaultMessage: 'Settings',
            }),
            icon: 'gear',
            onClick: onSettings,
          },
        ],
      },
    ],
    primaryActions: [
      <EuiButtonIcon
        key="streams-new"
        size="xs"
        color="text"
        iconType="plusInCircle"
        onClick={onCreateClassicStream}
        data-test-subj="headerGlobalNav-appActionsNewStreamButton"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.newAriaLabel', {
          defaultMessage: 'New',
        })}
      />,
    ],
  };
}

export interface StreamDetailHeaderAppActionsConfigDeps {
  onFeedback?: () => void;
  onPrimaryAction?: () => void;
}

/**
 * Header app actions config for the Stream detail view: overflow (Feedback)
 * and primary action button with Discover app icon.
 */
export function getStreamDetailHeaderAppActionsConfig(
  deps: StreamDetailHeaderAppActionsConfigDeps = {}
): ChromeHeaderAppActionsConfig {
  const { onFeedback = () => {}, onPrimaryAction = () => {} } = deps;

  return {
    overflowPanels: [
      {
        id: 0,
        title: '',
        items: [
          {
            name: i18n.translate('xpack.streams.streamDetailHeaderAppActions.feedback', {
              defaultMessage: 'Feedback',
            }),
            icon: 'editorComment',
            onClick: onFeedback,
          },
        ],
      },
    ],
    primaryActions: [
      <EuiButtonIcon
        key="stream-detail-discover"
        size="xs"
        color="text"
        iconType="discoverApp"
        onClick={onPrimaryAction}
        data-test-subj="headerGlobalNav-appActionsStreamDetailDiscoverButton"
        aria-label={i18n.translate('xpack.streams.streamDetailHeaderAppActions.discoverAriaLabel', {
          defaultMessage: 'Discover',
        })}
      />,
    ],
  };
}
