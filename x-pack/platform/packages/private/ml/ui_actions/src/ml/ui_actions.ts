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

/**
 * Context for the Discover anomaly detection management action.
 */
export interface DiscoverADManagementContext {
  /**
   * The index name or index pattern to suggest jobs for.
   */
  indexPattern: string;
  /**
   * The data view of the index pattern. When it is not provided, a data view matching
   * `indexPattern` is looked up.
   */
  dataViewId?: string;
  /**
   * Invoked after the flyout is closed.
   */
  onClose?: () => void;
}

export const DISCOVER_AD_MANAGEMENT_ACTION = 'discoverADManagementAction';

/**
 * A time range in which anomaly detection jobs found anomalies.
 */
export interface DiscoverADAnomalyRange {
  /** The job which found the anomalies */
  jobId: string;
  /** Start of the range, in epoch ms */
  start: number;
  /** End of the range, in epoch ms */
  end: number;
  /** Highest anomaly score (0-100) in the range */
  score: number;
}

/**
 * Context for the action which provides the anomalies to show on the Discover chart.
 */
export interface DiscoverADAnomaliesContext {
  /**
   * The index name or index pattern the chart shows, for which a job is selected.
   */
  indexPattern: string;
  /**
   * The time range of the chart, in epoch ms.
   */
  timeRange: { from: number; to: number };
  /**
   * The width in pixels of the chart, used to choose the size of the anomaly buckets.
   */
  chartWidth?: number;
  /**
   * Aborted when the result is no longer needed.
   */
  signal?: AbortSignal;
  /**
   * Called with the anomaly ranges found, which are empty when there are no matching jobs or anomalies.
   */
  onAnomalyRanges: (ranges: DiscoverADAnomalyRange[]) => void;
  /**
   * Called with the job which is selected for the index pattern, and again each time it, or whether its
   * anomalies are shown, changes.
   */
  onJobSelection?: (selection: DiscoverADJobSelection) => void;
}

/**
 * The anomaly detection job selected for the Discover chart, and whether its anomalies are shown.
 */
export interface DiscoverADJobSelection {
  /** The selected job, which is undefined when there is none. */
  jobId?: string;
  showAnomalies: boolean;
  /** Shows or hides the anomalies of the selected job on the chart, without deselecting it. */
  setShowAnomalies: (show: boolean) => void;
}

export const DISCOVER_AD_ANOMALIES_ACTION = 'discoverADAnomaliesAction';

/**
 * Context for the action which shows the details of an anomaly found by a job.
 */
export interface DiscoverADAnomalyContext {
  /**
   * The job which found the anomaly.
   */
  jobId: string;
  /**
   * The time of the anomaly, in epoch ms.
   */
  timestamp: number;
  /**
   * The end of the time range of the anomaly, in epoch ms.
   */
  endTimestamp: number;
  /**
   * The anomaly score (0-100).
   */
  score: number;
  /**
   * Invoked after the flyout is closed.
   */
  onClose?: () => void;
}

export const DISCOVER_AD_ANOMALY_ACTION = 'discoverADAnomalyAction';
