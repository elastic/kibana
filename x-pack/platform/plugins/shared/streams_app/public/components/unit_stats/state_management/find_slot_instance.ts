/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PROCESSING_SLOT_KIND, type ProcessingNodeRef } from '../../../services/unit_graph';
import type {
  ProcessorInstanceStatsView,
  ProcessorStatsView,
} from '../../../services/unit_stats_client/types';

/**
 * The instance of a processor that ran in a slot, or `undefined` when it has no data there. A
 * processor is defined once and runs once for each pipeline and route that lists it, so a result
 * has an instance for each place. A pipeline slot is the instance with no route index, and a route
 * slot is the instance with that route index.
 *
 * A route is identified by its position. If routes were added, removed or reordered within the
 * window, an instance can describe a different route. A route with no condition and no destination
 * of its own may be reported as part of the entry pipeline, and then a route slot finds nothing.
 * When two instances match, the first is returned.
 */
export const findSlotInstance = (
  stats: ProcessorStatsView | undefined,
  ref: ProcessingNodeRef
): ProcessorInstanceStatsView | undefined => {
  const routeIndex = ref.kind === PROCESSING_SLOT_KIND.route ? ref.routeIndex : null;

  return stats?.instances.find(
    (instance) => instance.pipelineId === ref.pipelineId && instance.routeIndex === routeIndex
  );
};
