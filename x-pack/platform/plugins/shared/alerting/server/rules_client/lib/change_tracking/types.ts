/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SavedObjectReference } from '@kbn/core/server';
import type { RuleTypeSolution } from '@kbn/alerting-types';
import type { RawRule } from '../../../types';

/**
 * Represents a single document in the change history
 */
export interface ChangeHistoryDocument {
  '@timestamp': string;

  user: {
    id: string;
    name?: string;
  };

  event: {
    id: string;
    module: string;
    dataset: string;
    action: string;
    type: 'change';
    outcome: 'success';
    reason?: string;
    group?: {
      id: string;
    };
  };

  object: {
    id: string;
    type: string;
    hash: string;
    changes?: string[];
    oldvalues?: Record<string, unknown>;
    snapshot?: Record<string, unknown>;
  };

  metadata?: Record<string, unknown>;

  kibana: {
    space_id: string;
    version: string;
  };
}

// All rules belong to a solution
export interface RuleData {
  id: string;
  type: string;
  module: RuleTypeSolution;
  current?: RawRule; // <-- Current version of the rule. If available.
  next: RawRule; // <-- Version of the rule after changes (ie the snapshot). Always required.
  references?: [] | SavedObjectReference[];
}

/**
 * Values to override in the change history log entry
 */
export type LogChangeOverrides = Partial<ChangeHistoryDocument>;

/**
 * Result from a history query.
 */
export interface GetHistoryResult {
  startDate?: Date;
  total: number;
  items: ChangeHistoryDocument[];
}

/**
 * Options for initializing the change tracking service.
 */
export interface ChangeTrackingContext {
  logger: Logger;
  kibanaVersion: string;
}
