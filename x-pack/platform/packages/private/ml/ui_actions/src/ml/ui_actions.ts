/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';

export interface CreateCategorizationADJobContext {
  field: DataViewField;
  dataView: DataView;
  query: QueryDslQueryContainer;
  timeRange: TimeRange;
}

export const CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_ACTION = 'createMLADCategorizationJobAction';

/**
 * Context for the update AD jobs project routing action; extend when a caller provides job selection.
 */
export interface UpdateADJobsProjectRoutingContext {
  /**
   * Invoked after the update project routing flyout is closed, when the trigger is executed with this in context.
   */
  onClose?: () => void;
  initialJobIds?: string[];
  allowScopeSelection?: boolean;
}

export const UPDATE_AD_JOBS_PROJECT_ROUTING_ACTION = 'updateADJobsProjectRoutingAction';

/**
 * Context for the suggest anomaly detection jobs action.
 */
export interface SuggestADJobsContext {
  /**
   * The index name or index pattern to suggest jobs for.
   */
  indexPattern: string;
  /**
   * Used to open the job wizards on the data view. When neither this nor `savedSearchId` is
   * provided, a data view matching `indexPattern` is looked up.
   */
  dataViewId?: string;
  /**
   * Used to open the job wizards on a saved Discover session.
   */
  savedSearchId?: string;
  projectRouting?: string;
  /**
   * Invoked after the flyout is closed.
   */
  onClose?: () => void;
}

export const SUGGEST_AD_JOBS_ACTION = 'suggestADJobsAction';
