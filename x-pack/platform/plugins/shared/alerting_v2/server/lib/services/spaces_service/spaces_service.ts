/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { PluginStart } from '@kbn/core-di';
import type { KibanaRequest } from '@kbn/core/server';
import type { SpaceId } from '@kbn/core-spaces-common';
import type { Space } from '@kbn/spaces-plugin/common';
import type { SpacesPluginStart, SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { AlertingServerStartDependencies } from '../../../types';

/**
 * Wraps the Spaces plugin so clients and services depend on a single alerting-owned
 * seam instead of reaching into `spaces.spacesService` directly. Implementing
 * `Pick<SpacesServiceStart, ...>` makes any upstream signature drift on the
 * re-exposed methods a compile error.
 */
@injectable()
export class SpacesService implements Pick<SpacesServiceStart, 'getSpaceId' | 'getActiveSpace'> {
  constructor(
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart
  ) {}

  public getSpaceId(request: KibanaRequest): SpaceId {
    return this.spaces.spacesService.getSpaceId(request);
  }

  public getActiveSpace(request: KibanaRequest): Promise<Space> {
    return this.spaces.spacesService.getActiveSpace(request);
  }

  public spaceIdToNamespace(spaceId?: string): string | undefined {
    return spaceId ? this.spaces.spacesService.spaceIdToNamespace(spaceId) : undefined;
  }

  public getNamespace(request: KibanaRequest): string | undefined {
    return this.spaceIdToNamespace(this.getSpaceId(request));
  }
}
