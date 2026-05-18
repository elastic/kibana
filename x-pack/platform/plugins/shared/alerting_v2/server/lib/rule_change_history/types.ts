/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type {
  GetChangeHistoryOptions,
  GetHistoryResult,
  LogChangeHistoryOptions,
  ObjectChange,
} from '@kbn/change-history';
import type { RuleSavedObjectAttributes } from '../../saved_objects';
import type { UserServiceContract } from '../services/user_service/user_service';

export interface RuleChangeHistoryScope {
  module: string;
  dataset: string;
  objectType: string;
}

export interface RuleSnapshot {
  attributes: RuleSavedObjectAttributes;
  references: SavedObjectReference[];
}

/** Single rule change written to `.kibana_change_history`. */
export interface RuleChange extends Omit<ObjectChange, 'objectType' | 'objectId' | 'snapshot'> {
  objectId: string;
  /** Post-change rule state; persisted as `object.snapshot` by @kbn/change-history. */
  snapshot: RuleSnapshot;
}

export type ScopedLogChangeHistoryOptions = Omit<
  LogChangeHistoryOptions,
  'username' | 'userProfileId'
>;

export interface RuleChangeHistoryEntry {
  id: string;
  attributes: RuleSavedObjectAttributes;
}

export interface LogRuleChangesParams {
  spaceId: string;
  userService: UserServiceContract;
  entries: RuleChangeHistoryEntry[];
  action: string;
  timestamp?: string | number | Date;
  metadata?: Record<string, string | number | boolean>;
  eventType?: 'deletion';
}

export type { GetChangeHistoryOptions, GetHistoryResult };
