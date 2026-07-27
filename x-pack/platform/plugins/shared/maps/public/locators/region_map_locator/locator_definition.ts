/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/public';
import type { MapsAppRegionMapLocatorParams, MapsAppRegionMapLocatorDependencies } from './types';
import { TimeRange } from '@kbn/es-query';

export const MAPS_APP_REGION_MAP_LOCATOR = 'MAPS_APP_REGION_MAP_LOCATOR' as const;

export class MapsAppRegionMapLocatorDefinition
  implements LocatorDefinition<MapsAppRegionMapLocatorParams>
{
  public readonly id = MAPS_APP_REGION_MAP_LOCATOR;

  constructor(protected readonly deps: MapsAppRegionMapLocatorDependencies) {}

  public readonly getTimeRange = (params: MapsAppRegionMapLocatorParams) => params.timeRange;
  
  public readonly setTimeRange = (params: MapsAppRegionMapLocatorParams, timeRange?: TimeRange) => ({
    ...params,
    timeRange
  });

  public readonly getLocation = async (params: MapsAppRegionMapLocatorParams) => {
    const { getLocation } = await import('./get_location');
    return getLocation(params, this.deps);
  };
}
