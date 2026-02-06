/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import {
  ruleDetailsLocatorID,
  sloDetailsLocatorID,
  type RuleDetailsLocatorParams,
  type SloDetailsLocatorParams,
} from '@kbn/deeplinks-observability';
import type { LocatorClient } from '@kbn/share-plugin/common/url_service';
import type { AttachmentType } from '@kbn/streams-plugin/server/lib/streams/attachments/types';

const URL_GETTERS: Record<
  AttachmentType,
  (
    redirectId: string,
    locatorsService: LocatorClient,
    timeRange: { from: string; to: string }
  ) => string | undefined
> = {
  dashboard: (redirectId, locatorsService, timeRange) => {
    const dashboardLocator = locatorsService.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
    return dashboardLocator?.getRedirectUrl({
      dashboardId: redirectId,
      time_range: timeRange,
    });
  },
  rule: (redirectId, locatorsService) => {
    const ruleLocator = locatorsService.get<RuleDetailsLocatorParams>(ruleDetailsLocatorID);
    return ruleLocator?.getRedirectUrl({ ruleId: redirectId });
  },
  slo: (redirectId, locatorsService) => {
    const sloLocator = locatorsService.get<SloDetailsLocatorParams>(sloDetailsLocatorID);
    return sloLocator?.getRedirectUrl({ sloId: redirectId });
  },
};

export function getAttachmentUrl(
  redirectId: string,
  type: AttachmentType,
  locatorsService: LocatorClient,
  timeRange: { from: string; to: string }
): string | undefined {
  return URL_GETTERS[type](redirectId, locatorsService, timeRange);
}
