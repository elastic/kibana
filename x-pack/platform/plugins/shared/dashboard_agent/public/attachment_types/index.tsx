/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Observable } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { DASHBOARD_ATTACHMENT_TYPE, DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { DashboardFlyout } from '../components/dashboard_flyout';
import type { AttachmentStore } from '../services/attachment_store';

type DashboardAttachment = Attachment<
  typeof DASHBOARD_ATTACHMENT_TYPE,
  { title?: string } & Record<string, unknown>
>;

/**
 * Registers the dashboard attachment UI definition, including the icon and label.
 */
export const registerDashboardAttachmentUiDefinition = ({
  attachments,
  attachmentStore,
  chat$,
  share,
  core,
}: {
  attachments: AttachmentServiceStartContract;
  attachmentStore: AttachmentStore;
  chat$: Observable<ChatEvent>;
  share?: SharePluginStart;
  core: CoreStart;
}) => {
  // Helper function to open the flyout
  const openFlyout = (attachmentId: string, data: DashboardAttachmentData) => {
    // Set the current attachment in the store
    attachmentStore.setAttachment(attachmentId, data);

    let flyoutSession: ReturnType<typeof core.overlays.openFlyout> | undefined;

    const onClose = () => {
      attachmentStore.clear();
      flyoutSession?.close();
    };

    flyoutSession = core.overlays.openFlyout(
      toMountPoint(
        <KibanaRenderContextProvider {...core}>
          <DashboardFlyout
            initialData={data}
            attachmentId={attachmentId}
            attachmentStore={attachmentStore}
            chat$={chat$}
            onClose={onClose}
            share={share}
          />
        </KibanaRenderContextProvider>,
        core
      ),
      {
        'data-test-subj': 'dashboardAttachmentFlyoutOverlay',
        ownFocus: true,
        onClose,
        size: 'l',
        maxWidth: '50vw',
        paddingSize: 'none',
        type: 'push',
      }
    );
  };

  // Register the callback so the store can open the flyout when updates arrive
  attachmentStore.registerOpenFlyoutCallback(openFlyout);

  attachments.addAttachmentType<DashboardAttachment>(DASHBOARD_ATTACHMENT_TYPE, {
    getLabel: (attachment) => {
      return (
        attachment.data?.title ||
        i18n.translate('xpack.dashboardAgent.attachments.dashboard.label', {
          defaultMessage: 'New Dashboard',
        })
      );
    },
    getIcon: () => 'productDashboard',
    onClick: ({ attachment }) => {
      console.log('Dashboard attachment clicked:', attachment);
      const data = attachment.data as DashboardAttachmentData | undefined;
      if (!data) return;

      openFlyout(attachment.id, data);
    },
  });
};
