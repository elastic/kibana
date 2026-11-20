/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, type Observable } from 'rxjs';

import type { BuildFlavor } from '@kbn/config';
import type { CoreSetup, Logger } from '@kbn/core/server';

import type { ConfigType } from '../config';
import type { ISpacesClient } from '../spaces_client';
import { SpacesClient } from '../spaces_client';
import type { SpacesPluginStartDeps } from '../types';

/**
 * The part of the spaces client that system work may use: deleting a space or finding what is in
 * it needs every space-scoped type, which the internal repository below does not cover.
 */
export type InternalSpacesClient = Pick<ISpacesClient, 'get' | 'create' | 'update'>;

/**
 * A spaces client for system work with no user request. It reads and writes the `space` type
 * through the internal repository, so it bypasses user authorization and callers decide which
 * spaces to change. It has no CPS client, so `projectRouting` is rejected.
 */
export const createInternalSpacesClient =
  ({
    core,
    config$,
    buildFlavor,
    logger,
  }: {
    core: CoreSetup<SpacesPluginStartDeps>;
    config$: Observable<ConfigType>;
    buildFlavor: BuildFlavor;
    logger: Logger;
  }) =>
  async (): Promise<InternalSpacesClient> => {
    const [coreStart, { features }] = await core.getStartServices();

    return new SpacesClient(
      (message) => logger.debug(message),
      await firstValueFrom(config$),
      coreStart.savedObjects.createInternalRepository(['space']),
      // Only finding or deleting what is inside a space reads these, and neither is exposed.
      [],
      buildFlavor,
      features,
      undefined
    );
  };
