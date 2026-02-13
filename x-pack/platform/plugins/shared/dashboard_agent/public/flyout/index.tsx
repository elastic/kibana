/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Observable } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { DashboardFlyout } from './dashboard_flyout';
import type { DashboardAttachmentStore } from '../services/attachment_store';

/**
 * Creates a flyout consumer that subscribes to attachmentStore and opens/updates the flyout.
 * Returns an unsubscribe function.
 */
export const createFlyoutConsumer = ({
  attachmentStore,
  core,
  chat$,
  share,
}: {
  attachmentStore: DashboardAttachmentStore;
  core: CoreStart;
  chat$: Observable<ChatEvent>;
  share?: SharePluginStart;
}): (() => void) => {
  let isFlyoutOpen = false;
  let flyoutSession: ReturnType<typeof core.overlays.openFlyout> | null = null;

  const closeFlyout = () => {
    isFlyoutOpen = false;
    flyoutSession?.close();
    flyoutSession = null;
  };

  const openFlyout = (attachmentId: string, data: DashboardAttachmentData) => {
    if (isFlyoutOpen) return;

    isFlyoutOpen = true;
    flyoutSession = core.overlays.openFlyout(
      toMountPoint(
        <KibanaRenderContextProvider {...core}>
          <DashboardFlyout
            initialData={data}
            attachmentId={attachmentId}
            attachmentStore={attachmentStore}
            chat$={chat$}
            onClose={closeFlyout}
            share={share}
          />
        </KibanaRenderContextProvider>,
        core
      ),
      {
        'data-test-subj': 'dashboardAttachmentFlyoutOverlay',
        ownFocus: true,
        onClose: closeFlyout,
        size: 'l',
        maxWidth: '50vw',
        paddingSize: 'none',
        type: 'push',
        isResizable: true,
      }
    );
  };

  // Subscribe to store state changes
  const subscription = attachmentStore.state$.subscribe((state) => {
    if (state) {
      openFlyout(state.attachmentId, state.data);
    }
  });

  return () => {
    subscription.unsubscribe();
    closeFlyout();
  };
};
