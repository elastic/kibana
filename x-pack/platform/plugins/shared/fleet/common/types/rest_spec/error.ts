/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BreakingChangesLog } from '../../services/changelog_utils';

import type { AgentVersionBlock } from './package_policy';

export type FleetErrorType =
  | 'verification_failed'
  | 'breaking_changes_not_acknowledged'
  | 'agent_version_incompatible';

export interface FleetErrorResponse {
  message: string;
  statusCode: number;
  attributes?: {
    type?: FleetErrorType;
    breaking_changes?: BreakingChangesLog;
    agent_version_block?: AgentVersionBlock;
  };
}
