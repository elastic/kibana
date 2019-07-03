/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaConfig } from 'src/legacy/server/kbn_server';
import { SavedObjectsService } from 'src/core/server';
import { XPackMainPlugin } from '../../../../../xpack_main/xpack_main';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { initInternalSpacesApi } from './spaces';
import { SpacesServiceSetup } from '../../../new_platform/spaces_service/spaces_service';
import { SpacesHttpServiceSetup } from '../../../new_platform/plugin';
import { initExampleApi } from './example';

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

interface RouteDeps {
  xpackMain: XPackMainPlugin;
  http: SpacesHttpServiceSetup;
  savedObjects: SavedObjectsService;
  spacesService: SpacesServiceSetup;
  config: KibanaConfig;
}

export interface InternalRouteDeps extends Omit<RouteDeps, 'xpackMain'> {
  routePreCheckLicenseFn: any;
}

export function initInternalApis({ xpackMain, ...rest }: RouteDeps) {
  const routePreCheckLicenseFn = routePreCheckLicense({ xpackMain });

  const deps: InternalRouteDeps = {
    ...rest,
    routePreCheckLicenseFn,
  };

  initInternalSpacesApi(deps);
  initExampleApi(deps);
}
