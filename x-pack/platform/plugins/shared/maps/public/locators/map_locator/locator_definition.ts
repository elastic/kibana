/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/public';
import type { MapsAppLocatorDependencies, MapsAppLocatorParams } from './types';

export const MAPS_APP_LOCATOR = 'MAPS_APP_LOCATOR' as const;

export class MapsAppLocatorDefinition implements LocatorDefinition<MapsAppLocatorParams> {
  public readonly id = MAPS_APP_LOCATOR;

  constructor(protected readonly deps: MapsAppLocatorDependencies) {}

  public readonly getLocation = async (params: MapsAppLocatorParams) => {
    const { getLocation } = await import('./get_location');
    return getLocation(params, this.deps);
  };
}
