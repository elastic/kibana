/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import deepEqual from 'fast-deep-equal';
import { attachmentDataToDashboardState } from '@kbn/dashboard-agent-common';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_ATTACHMENT_TYPE } from '../../../../common/constants';
import {
  DashboardAttachmentPayloadSchema,
  hasDashboardConfig,
  type DashboardAttachmentData,
} from '../../../../common/types/domain_zod/attachment/dashboard/v2';
import {
  defineAttachment,
  type UnifiedValueAttachmentViewProps,
} from '../../../client/attachment_framework/types';
import * as i18n from './translations';
import { DashboardReferenceEvent } from './reference_event';

type DashboardViewProps = UnifiedValueAttachmentViewProps<DashboardAttachmentData>;

const DashboardEmbedAttachment = React.memo(
  ({ data }: DashboardViewProps) => {
    if (!hasDashboardConfig(data)) return null;
    const initialInput = {
      ...attachmentDataToDashboardState(data.config),
      ...(data.timeRange ? { timeRange: data.timeRange } : {}),
      viewMode: 'view' as const,
    };
    return (
      <DashboardRenderer
        getCreationOptions={async () => ({ getInitialInput: () => initialInput })}
        showPlainSpinner
        savedObjectId={data.savedObjectId}
      />
    );
  },
  (prev, next) => deepEqual(prev.data, next.data)
);

DashboardEmbedAttachment.displayName = 'DashboardEmbedAttachment';

const DashboardEmbedAttachmentLazy = React.lazy(async () => ({
  default: DashboardEmbedAttachment,
}));

const getDashboardAttachmentViewObject = ({ data }: DashboardViewProps) => {
  // Snapshot present ⇒ render the dashboard inline. Absent ⇒ title-only event
  // (in-app link is resolved by the reference component itself).
  if (!hasDashboardConfig(data)) {
    return {
      event: <DashboardReferenceEvent savedObjectId={data.savedObjectId} title={data.title} />,
      timelineAvatar: 'dashboardApp',
      hideDefaultActions: false,
    };
  }
  return {
    event: i18n.ADDED_DASHBOARD,
    timelineAvatar: 'dashboardApp',
    hideDefaultActions: false,
    children: DashboardEmbedAttachmentLazy,
  };
};

export const getDashboardAttachmentType = () =>
  defineAttachment({
    id: DASHBOARD_ATTACHMENT_TYPE,
    icon: 'dashboardApp',
    displayName: i18n.DASHBOARDS,
    getAttachmentViewObject: getDashboardAttachmentViewObject,
    getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_DASHBOARD }),
    schema: DashboardAttachmentPayloadSchema,
  });
