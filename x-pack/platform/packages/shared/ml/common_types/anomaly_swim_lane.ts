/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ForwardRefExoticComponent, RefAttributes } from 'react';

import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { RefreshInterval } from '@kbn/data-plugin/common';

import type { JobId } from './anomaly_detection_jobs/job';

// local definition to avoid circular dependency
// import type { SwimlaneType } from '@kbn/ml-common-constants/explorer';
type SwimlaneType = 'overall' | 'viewBy';

/** Manual input by the user */
export interface AnomalySwimlaneEmbeddableUserInput {
  jobIds: JobId[];
  panelTitle?: string;
  swimlaneType: SwimlaneType;
  viewBy?: string;
}

export interface AnomalySwimlaneEmbeddableCustomInput
  extends Omit<AnomalySwimlaneEmbeddableUserInput, 'panelTitle'> {
  id?: string;
  perPage?: number;

  // Embeddable inputs which are not included in the default interface
  filters?: Filter[];
  query?: Query;
  refreshConfig?: RefreshInterval;
  timeRange: TimeRange | undefined;
}

export interface AnomalySwimLaneProps extends AnomalySwimlaneEmbeddableCustomInput {
  id?: string;
  executionContext: KibanaExecutionContext;
}

export type AnomalySwimLaneComponentType = ForwardRefExoticComponent<
  AnomalySwimLaneProps & RefAttributes<{}>
>;
