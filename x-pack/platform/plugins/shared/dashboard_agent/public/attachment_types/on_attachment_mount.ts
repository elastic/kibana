/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY, switchMap, type Observable } from 'rxjs';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AttachmentLifecycleParams } from '@kbn/agent-builder-browser/attachments';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { createDashboardAttachmentMountSync$ } from './dashboard_integration/create_dashboard_attachment_mount_sync';

export interface OnAttachmentMountParams extends AttachmentLifecycleParams<DashboardAttachment> {
  dashboardPlugin: DashboardStart;
  chat$: Observable<ChatEvent>;
  addAttachment: (attachment: AttachmentInput) => void;
}

/**
 * Subscribes dashboard attachment sync when a dashboard app API is available
 * and cleans it up when the attachment unmounts.
 */
export const onAttachmentMount = ({
  dashboardPlugin,
  chat$,
  getAttachment,
  updateOrigin,
  addAttachment,
}: OnAttachmentMountParams) => {
  const apiSubscription = dashboardPlugin.dashboardAppClientApi$
    .pipe(
      switchMap((api) =>
        api
          ? createDashboardAttachmentMountSync$({
              api,
              chat$,
              getAttachment,
              updateOrigin,
              addAttachment,
            })
          : EMPTY
      )
    )
    .subscribe();

  return () => {
    apiSubscription.unsubscribe();
  };
};
