/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from './unit_repository';

export type UnitPipeline = Unit['unit']['pipelines'][number];
export type PipelineConfig = UnitPipeline['config'];
export type PipelineConfigEntry = PipelineConfig[number];
export type PipelineEntryName = PipelineConfigEntry['name'];

export const PIPELINE_ENTRY = {
  sources: 'sources',
  processors: 'processors',
  routes: 'routes',
  destinations: 'destinations',
} as const satisfies { [Name in PipelineEntryName]: Name };

export type RouteRule = Extract<
  PipelineConfigEntry,
  { name: typeof PIPELINE_ENTRY.routes }
>['value'][number];
export type DelegatingRoute = Extract<RouteRule, { pipelines: string[] }>;

/** Whether a route hands its records to child pipelines rather than to destinations. */
export const isDelegatingRoute = (route: RouteRule): route is DelegatingRoute =>
  'pipelines' in route;
