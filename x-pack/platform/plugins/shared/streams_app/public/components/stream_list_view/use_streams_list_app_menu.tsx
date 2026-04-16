/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuConfig, AppMenuSecondaryActionItem } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../../hooks/use_kibana';

/**
 * Project chrome: primary action and overflow items for the Streams list page.
 * Classic chrome leaves the legacy page header actions unchanged.
 */
export function useStreamsListAppMenu({
  canCreateClassicStream,
  onOpenSettings,
  onOpenClassicStreamCreation,
  sigEventsDiscovery,
  showCreateQueryStream,
  onOpenCreateQueryStream,
}: {
  canCreateClassicStream: boolean;
  onOpenSettings: () => void;
  onOpenClassicStreamCreation: () => void;
  sigEventsDiscovery?: { href: string; onNavigate: () => void };
  showCreateQueryStream?: boolean;
  onOpenCreateQueryStream?: () => void;
}): AppMenuConfig | undefined {
  const {
    core: { chrome },
  } = useKibana();
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  return useMemo((): AppMenuConfig | undefined => {
    if (!isProjectChrome) {
      return undefined;
    }

    const secondaryActionItems: AppMenuSecondaryActionItem[] = [
      {
        id: 'streams-list-settings',
        label: i18n.translate('xpack.streams.streamsListView.settingsButtonLabel', {
          defaultMessage: 'Settings',
        }),
        iconType: 'gear',
        run: () => {
          onOpenSettings();
        },
        testId: 'streamsListSettingsAppMenuButton',
      },
    ];

    if (sigEventsDiscovery) {
      secondaryActionItems.push({
        id: 'streams-list-sig-events-discovery',
        label: i18n.translate('xpack.streams.streamsListView.sigEventsDiscoveryButtonLabel', {
          defaultMessage: 'SigEvents Discovery',
        }),
        iconType: 'crosshairs',
        href: sigEventsDiscovery.href,
        run: () => {
          sigEventsDiscovery.onNavigate();
        },
        testId: 'streamsSignificantEventsDiscoveryAppMenuButton',
      });
    }

    if (showCreateQueryStream && onOpenCreateQueryStream) {
      secondaryActionItems.push({
        id: 'streams-list-create-query-stream',
        label: i18n.translate('xpack.streams.streamsListView.createQueryStreamButtonLabel', {
          defaultMessage: 'Create Query stream',
        }),
        iconType: 'plus',
        run: () => {
          onOpenCreateQueryStream();
        },
        testId: 'streamsAppCreateQueryStreamAppMenuButton',
      });
    }

    return {
      layout: 'chromeBarV2',
      primaryActionItem: {
        id: 'streams-list-create-classic',
        label: i18n.translate('xpack.streams.streamsListView.createClassicStreamButtonLabel', {
          defaultMessage: 'Create classic stream',
        }),
        iconType: 'plus',
        run: () => {
          onOpenClassicStreamCreation();
        },
        disableButton: !canCreateClassicStream,
        testId: 'streamsCreateClassicStreamAppMenuButton',
      },
      secondaryActionItems,
    };
  }, [
    isProjectChrome,
    canCreateClassicStream,
    onOpenSettings,
    onOpenClassicStreamCreation,
    sigEventsDiscovery,
    showCreateQueryStream,
    onOpenCreateQueryStream,
  ]);
}
