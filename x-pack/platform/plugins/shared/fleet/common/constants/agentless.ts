/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitoringType } from '../types';

export const AGENTLESS_AGENT_POLICY_INACTIVITY_TIMEOUT = 3600;
export const AGENTLESS_AGENT_POLICY_MONITORING: MonitoringType = ['logs', 'metrics'];
export const AGENTLESS_GLOBAL_TAG_NAME_ORGANIZATION = 'organization';
export const AGENTLESS_GLOBAL_TAG_NAME_DIVISION = 'division';
export const AGENTLESS_GLOBAL_TAG_NAME_TEAM = 'team';

// Input types to disable for agentless integrations
export const AGENTLESS_DISABLED_INPUTS = ['tcp', 'udp', 'filestream', 'http_endpoint', 'winlog'];
