/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Same as the plugin id defined by Security Solution
export const APP_ID = 'securitySolution' as const;
export const SERVER_APP_ID = 'siem' as const;

export const CASES_FEATURE_ID = 'securitySolutionCases' as const;
export const ASSISTANT_FEATURE_ID = 'securitySolutionAssistant' as const;

// Same as the plugin id defined by Cloud Security Posture
export const CLOUD_POSTURE_APP_ID = 'csp' as const;

// Same as the plugin id defined by Defend for containers (cloud_defend)
export const CLOUD_DEFEND_APP_ID = 'cloudDefend' as const;

/**
 * Id for the notifications alerting type
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const LEGACY_NOTIFICATIONS_ID = `siem.notifications` as const;
