/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import { useVulnerabilitiesPreview } from './use_vulnerabilities_preview';
import { hasVulnerabilitiesData } from '../utils/vulnerability_helpers';

export const useHasVulnerabilities = (field: 'host.name' | 'user.name', value: string) => {
  const { data: vulnerabilitiesData } = useVulnerabilitiesPreview({
    query: buildEntityFlyoutPreviewQuery(field, value),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const {
    CRITICAL = 0,
    HIGH = 0,
    MEDIUM = 0,
    LOW = 0,
    NONE = 0,
  } = vulnerabilitiesData?.count || {};

  const counts = {
    critical: CRITICAL,
    high: HIGH,
    medium: MEDIUM,
    low: LOW,
    none: NONE,
  };

  const hasVulnerabilitiesFindings = hasVulnerabilitiesData(counts);

  return { counts, hasVulnerabilitiesFindings };
};
