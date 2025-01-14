/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import { APP_ID } from './application';
import type { Owner } from './types';

/**
 * Owner
 */
export const SECURITY_SOLUTION_OWNER = 'securitySolution' as const;
export const OBSERVABILITY_OWNER = 'observability' as const;
export const GENERAL_CASES_OWNER = APP_ID;

export const OWNERS = [GENERAL_CASES_OWNER, OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER] as const;

interface RouteInfo {
  id: Owner;
  appId: string;
  label: string;
  iconType: string;
  appRoute: string;
  validRuleConsumers?: readonly AlertConsumers[];
}

export const OWNER_INFO: Record<Owner, RouteInfo> = {
  [SECURITY_SOLUTION_OWNER]: {
    id: SECURITY_SOLUTION_OWNER,
    appId: 'securitySolutionUI',
    label: 'Security',
    iconType: 'logoSecurity',
    appRoute: '/app/security',
    validRuleConsumers: [AlertConsumers.SIEM],
  },
  [OBSERVABILITY_OWNER]: {
    id: OBSERVABILITY_OWNER,
    appId: 'observability-overview',
    label: 'Observability',
    iconType: 'logoObservability',
    appRoute: '/app/observability',
    validRuleConsumers: [
      // only valid in serverless
      AlertConsumers.OBSERVABILITY,
      AlertConsumers.APM,
      AlertConsumers.INFRASTRUCTURE,
      AlertConsumers.LOGS,
      AlertConsumers.SLO,
      AlertConsumers.UPTIME,
      AlertConsumers.MONITORING,
    ],
  },
  [GENERAL_CASES_OWNER]: {
    id: GENERAL_CASES_OWNER,
    appId: 'management',
    label: 'Management',
    iconType: 'managementApp',
    appRoute: '/app/management/insightsAndAlerting',
    validRuleConsumers: [
      AlertConsumers.ML,
      AlertConsumers.STACK_ALERTS,
      AlertConsumers.EXAMPLE,
      AlertConsumers.DISCOVER,
    ],
  },
} as const;
