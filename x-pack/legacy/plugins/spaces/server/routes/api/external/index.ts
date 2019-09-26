/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { Logger, SavedObjectsService } from 'src/core/server';
import { XPackMainPlugin } from '../../../../../xpack_main/xpack_main';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { initDeleteSpacesApi } from './delete';
import { initGetSpacesApi } from './get';
import { initPostSpacesApi } from './post';
import { initPutSpacesApi } from './put';
import { SpacesServiceSetup } from '../../../new_platform/spaces_service/spaces_service';
import { initCopyToSpacesApi } from './copy_to_space';

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

interface RouteDeps {
  xpackMain: XPackMainPlugin;
  legacyRouter: Legacy.Server['route'];
  savedObjects: SavedObjectsService;
  spacesService: SpacesServiceSetup;
  log: Logger;
}

export interface ExternalRouteDeps extends Omit<RouteDeps, 'xpackMain'> {
  routePreCheckLicenseFn: any;
}

export type ExternalRouteRequestFacade = Legacy.Request;

export function initExternalSpacesApi({ xpackMain, ...rest }: RouteDeps) {
  const routePreCheckLicenseFn = routePreCheckLicense({ xpackMain });

  const deps: ExternalRouteDeps = {
    ...rest,
    routePreCheckLicenseFn,
  };

  initDeleteSpacesApi(deps);
  initGetSpacesApi(deps);
  initPostSpacesApi(deps);
  initPutSpacesApi(deps);
  initCopyToSpacesApi(deps);
}
