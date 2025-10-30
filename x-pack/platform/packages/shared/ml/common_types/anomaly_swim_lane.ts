/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ForwardRefExoticComponent, RefAttributes } from 'react';

import type { TypeOf } from '@kbn/config-schema/src/types';
import type { KibanaExecutionContext } from '@kbn/core/public';

import type {
  anomalySwimlaneEmbeddableCustomInputOverallSchema,
  anomalySwimlaneEmbeddableCustomInputSchema,
  anomalySwimlaneEmbeddableCustomInputViewBySchema,
  anomalySwimlaneEmbeddableUserInputSchema,
  anomalySwimlaneInitialInputSchema,
} from '../../server/embeddable/schemas';

/** Manual input by the user */
export type AnomalySwimlaneEmbeddableUserInput = TypeOf<
  typeof anomalySwimlaneEmbeddableUserInputSchema
>;

export type AnomalySwimlaneInitialInput = TypeOf<typeof anomalySwimlaneInitialInputSchema>;

export type AnomalySwimlaneEmbeddableCustomInputViewBy = TypeOf<
  typeof anomalySwimlaneEmbeddableCustomInputViewBySchema
>;

export type AnomalySwimlaneEmbeddableCustomInputOverall = TypeOf<
  typeof anomalySwimlaneEmbeddableCustomInputOverallSchema
>;

export type AnomalySwimlaneEmbeddableCustomInput = TypeOf<
  typeof anomalySwimlaneEmbeddableCustomInputSchema
>;

export interface AnomalySwimLaneProps extends AnomalySwimlaneEmbeddableCustomInput {
  id?: string;
  executionContext: KibanaExecutionContext;
}

export type AnomalySwimLaneComponentType = ForwardRefExoticComponent<
  AnomalySwimLaneProps & RefAttributes<{}>
>;
