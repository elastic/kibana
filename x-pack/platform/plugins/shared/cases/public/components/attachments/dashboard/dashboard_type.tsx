/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { DASHBOARD_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import type {
  AttachmentViewObject,
  RegisteredAttachmentType,
  RegisteredAttachmentViewProps,
  AttachmentMetadataFetcher,
} from '../../../client/attachment_framework/types';
import { useDashboardMetadata, type DashboardMetadata } from './use_dashboard_metadata';
import { DashboardAttachmentEvent } from './dashboard_attachment_event';
import * as i18n from './translations';

// const DashboardAttachmentRenderer = lazy(() =>
//   import('./dashboard_renderer').then((module) => ({ default: module.DashboardAttachmentRenderer }))
// );

const DashboardListRenderer = lazy(() =>
  import('./dashboard_list').then((module) => ({ default: module.DashboardList }))
);

const getDashboardAttachmentViewObject = (
  props: RegisteredAttachmentViewProps
): AttachmentViewObject<RegisteredAttachmentViewProps> => {
  return {
    event: (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <DashboardAttachmentEvent attachmentId={props.attachmentId} />
      </Suspense>
    ),
    timelineAvatar: 'dashboardApp',
    hideDefaultActions: false,
    // children: DashboardAttachmentRenderer,
  };
};

const getDashboardMetadataFetcher = (): AttachmentMetadataFetcher<DashboardMetadata> => ({
  useAttachmentMetadata: useDashboardMetadata,
});

export const getDashboardType = (): RegisteredAttachmentType => ({
  id: DASHBOARD_ATTACHMENT_TYPE,
  icon: 'dashboardApp',
  displayName: 'Dashboard',
  getAttachmentViewObject: getDashboardAttachmentViewObject,
  getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_DASHBOARD }),
  getAttachmentListRenderer: () => DashboardListRenderer,
  getAttachmentMetadataFetcher: getDashboardMetadataFetcher,
});
