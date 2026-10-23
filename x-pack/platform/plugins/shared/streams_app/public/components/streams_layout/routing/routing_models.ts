/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import type { Unit } from '../../../services/unit_repository';
import type { RoutingRuleViewModel, RoutingTarget, RoutingViewModel } from './types';

interface PipelineEntries {
  sources: string[];
  destinations: string[];
  processors: string[];
  routes?: StreamsUnit.PipelineRoute[];
}

const readPipelineEntries = (pipeline: StreamsUnit.Pipeline): PipelineEntries => {
  const entries: PipelineEntries = { sources: [], destinations: [], processors: [] };
  for (const entry of pipeline.config) {
    switch (entry.name) {
      case 'sources':
        entries.sources = [...entry.value];
        break;
      case 'destinations':
        entries.destinations = [...entry.value];
        break;
      case 'processors':
        entries.processors = [...entry.value];
        break;
      case 'routes':
        entries.routes = [...entry.value];
        break;
    }
  }
  return entries;
};

const routeTargets = (route: StreamsUnit.PipelineRoute): RoutingTarget[] =>
  'destinations' in route
    ? route.destinations.map((id) => ({ kind: 'destination', id }))
    : route.pipelines.map((id) => ({ kind: 'pipeline', id }));

const toRoutingRule = (route: StreamsUnit.PipelineRoute, index: number): RoutingRuleViewModel => ({
  index,
  when: route.when,
  action: route.action,
  targets: routeTargets(route),
});

const referencedPipelineIds = (pipelines: readonly StreamsUnit.Pipeline[]): Set<string> => {
  const ids = new Set<string>();
  for (const pipeline of pipelines) {
    for (const route of readPipelineEntries(pipeline).routes ?? []) {
      if ('pipelines' in route) {
        route.pipelines.forEach((id) => ids.add(id));
      }
    }
  }
  return ids;
};

/**
 * Pipelines that branch records: every pipeline with `routes`, plus every
 * pipeline another route forwards to. A routed child pipeline that uses a plain
 * `destinations` list is surfaced as a single unconditional rule.
 */
export const getUnitRoutings = (unit: Unit): RoutingViewModel[] => {
  const { pipelines } = unit.unit;
  const referenced = referencedPipelineIds(pipelines);

  return pipelines.flatMap((pipeline): RoutingViewModel[] => {
    const { sources, destinations, routes } = readPipelineEntries(pipeline);
    const base = { id: pipeline.id, name: pipeline.name, sourceIds: sources };
    if (routes) {
      return [{ ...base, rules: routes.map(toRoutingRule) }];
    }
    if (!referenced.has(pipeline.id)) {
      return [];
    }
    return [
      {
        ...base,
        rules: [
          {
            index: 0,
            targets: destinations.map((id) => ({ kind: 'destination', id })),
          },
        ],
      },
    ];
  });
};
