/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import { ReportingHealthInfo } from '@kbn/reporting-common/types';

export const getReportingHealth = async ({
  http,
}: {
  http: HttpSetup;
}): Promise<ReportingHealthInfo> => {
  const res = await http.get<{
    is_sufficiently_secure: boolean;
    has_permanent_encryption_key: boolean;
    are_notifications_enabled: boolean;
  }>(INTERNAL_ROUTES.HEALTH);
  return {
    isSufficientlySecure: res.is_sufficiently_secure,
    hasPermanentEncryptionKey: res.has_permanent_encryption_key,
    areNotificationsEnabled: res.are_notifications_enabled,
  };
};
