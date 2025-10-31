/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ForwardRefExoticComponent, RefAttributes } from 'react';

import type { KibanaExecutionContext } from '@kbn/core/public';
import type { AnomalySwimlaneProps as AnomalySwimlanePropsDefault } from '@kbn/ml-common-api-schemas/embeddable/anomaly_swimlane';

export interface AnomalySwimLaneProps extends AnomalySwimlanePropsDefault {
  id?: string;
  executionContext: KibanaExecutionContext;
}

export type AnomalySwimLaneComponentType = ForwardRefExoticComponent<
  AnomalySwimLaneProps & RefAttributes<{}>
>;
