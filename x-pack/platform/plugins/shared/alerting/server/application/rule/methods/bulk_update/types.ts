/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectReference } from '@kbn/core/server';
import type { RuleChangeTracking } from '@kbn/alerting-types';
import type { IntervalSchedule } from '../../../../../common';
import type { BulkOperationError } from '../../../../rules_client/types';
import type { RawRule } from '../../../../types';
import type { RuleParams } from '../../types';
import type { UpdateRuleData } from '../update/types';
import type { ApiKeyEntry } from '../common_utils/invalidate_keys';

export interface BulkUpdateRulesItem<Params extends RuleParams = never> {
  id: string;
  data: UpdateRuleData<Params>;
}

export interface BulkUpdateRulesParams<Params extends RuleParams = never> {
  rules: Array<BulkUpdateRulesItem<Params>>;
  /** Per-batch size (callers should enforce request-level limits). */
  batchSize?: number;
  /** If true, stop on the first error of any kind. Defaults to false. */
  exitEarlyOnError?: boolean;
  /** Rule change tracking context. `action` defaults to `RuleChangeTrackingAction.ruleUpdate`; consumers can override. */
  changeTracking?: RuleChangeTracking;
  /** If true, skip the missing-secrets check so import can succeed when connectors arrive without secrets. */
  allowMissingConnectorSecrets?: boolean;
}

export interface BulkUpdateRulesResult {
  /** IDs of rules that were persisted. */
  successfulIds: string[];
  errors: BulkOperationError[];
  total: number;
}

export interface PreparedUpdate {
  id: string;
  name: string;
  version?: string;
  rawRule: RawRule;
  references: SavedObjectReference[];
  previousSchedule: IntervalSchedule;
  newSchedule: IntervalSchedule;
  scheduledTaskId?: string | null;
  oldKeys: ApiKeyEntry;
}

export interface BatchResult<Params extends RuleParams = never> {
  successfulIds: string[];
  errors: BulkOperationError[];
  circuitBreaker?: (item: BulkUpdateRulesItem<Params>) => BulkOperationError;
}

export interface Pending<Params extends RuleParams = never> {
  item: BulkUpdateRulesItem<Params>;
  original: SavedObject<RawRule>;
}
