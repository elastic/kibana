/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import {
  dashboardStateToAttachmentData,
  type DashboardAttachmentData as DashboardAttachmentApiData,
} from '@kbn/agent-builder-dashboards-common';
import { DASHBOARD_ATTACHMENT_TYPE, DASHBOARD_SO_TYPE } from '../../../../common/constants';
import type { DashboardAttachmentPayload } from '../../../../common/types/domain_zod/attachment/dashboard/v2';
import { fitsSnapshotBudget } from '../common/saved_object/helpers';

export type DashboardPayload = Omit<DashboardAttachmentPayload, 'owner'>;

const fetchDashboardConfig = async (
  dashboard: DashboardStart | undefined,
  id: string
): Promise<DashboardAttachmentApiData | undefined> => {
  if (!dashboard) {
    return undefined;
  }
  try {
    const findService = await dashboard.findDashboardsService();
    const result = await findService.findById(id);
    if (result.status !== 'success') {
      return undefined;
    }
    const config = dashboardStateToAttachmentData(result.attributes);
    return fitsSnapshotBudget(config) ? config : undefined;
  } catch {
    return undefined;
  }
};

export const buildDashboardPayload = async ({
  dashboard,
  id,
  title,
}: {
  dashboard: DashboardStart | undefined;
  id: string;
  title: string;
}): Promise<DashboardPayload> => {
  const config = await fetchDashboardConfig(dashboard, id);
  return {
    type: DASHBOARD_ATTACHMENT_TYPE,
    attachmentId: id,
    metadata: { title, soType: DASHBOARD_SO_TYPE },
    ...(config ? { data: { config } } : {}),
  };
};
