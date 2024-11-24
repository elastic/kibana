/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import { useMisconfigurationPreview } from './use_misconfiguration_preview';

export const useHasMisconfigurations = (field: 'host.name' | 'user.name', value: string) => {
  const { data } = useMisconfigurationPreview({
    query: buildEntityFlyoutPreviewQuery(field, value),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const passedFindings = data?.count.passed || 0;
  const failedFindings = data?.count.failed || 0;

  const hasMisconfigurationFindings = passedFindings > 0 || failedFindings > 0;

  return {
    passedFindings,
    failedFindings,
    hasMisconfigurationFindings,
  };
};
