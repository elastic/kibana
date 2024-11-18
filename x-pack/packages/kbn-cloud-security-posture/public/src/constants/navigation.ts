/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLOUD_SECURITY_POSTURE_BASE_PATH } from '@kbn/cloud-security-posture-common';
import { i18n } from '@kbn/i18n';

export const NAV_ITEMS_NAMES = {
  DASHBOARD: i18n.translate('xpack.csp.navigation.dashboardNavItemLabel', {
    defaultMessage: 'Cloud Security Posture',
  }),
  VULNERABILITY_DASHBOARD: i18n.translate(
    'xpack.csp.navigation.vulnerabilityDashboardNavItemLabel',
    { defaultMessage: 'Cloud Native Vulnerability Management' }
  ),
  FINDINGS: i18n.translate('xpack.csp.navigation.findingsNavItemLabel', {
    defaultMessage: 'Findings',
  }),
  BENCHMARKS: i18n.translate('xpack.csp.navigation.myBenchmarksNavItemLabel', {
    defaultMessage: 'Benchmarks',
  }),
  RULES: i18n.translate('xpack.csp.navigation.rulesNavItemLabel', {
    defaultMessage: 'Rules',
  }),
};

export const findingsNavigation = {
  findings_default: {
    name: NAV_ITEMS_NAMES.FINDINGS,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/findings/configurations`,
    id: 'cloud_security_posture-findings-default',
  },
  findings_by_resource: {
    name: NAV_ITEMS_NAMES.FINDINGS,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/findings/resource`,
    id: 'cloud_security_posture-findings-resource',
  },
  resource_findings: {
    name: NAV_ITEMS_NAMES.FINDINGS,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/findings/resource/:resourceId`,
    id: 'cloud_security_posture-findings-resourceId',
  },
  vulnerabilities: {
    name: NAV_ITEMS_NAMES.FINDINGS,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/findings/vulnerabilities`,
    id: 'cloud_security_posture-findings-vulnerabilities',
  },
  vulnerabilities_by_resource: {
    name: NAV_ITEMS_NAMES.FINDINGS,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/findings/vulnerabilities/resource`,
    id: 'cloud_security_posture-findings-vulnerabilities-resource',
  },
  resource_vulnerabilities: {
    name: NAV_ITEMS_NAMES.FINDINGS,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/findings/vulnerabilities/resource/:resourceId`,
    id: 'cloud_security_posture-findings-vulnerabilities-resourceId',
  },
};
