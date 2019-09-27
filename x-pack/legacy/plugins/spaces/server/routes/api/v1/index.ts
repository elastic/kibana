/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { XPackMainPlugin } from '../../../../../xpack_main/xpack_main';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { initInternalSpacesApi } from './spaces';
import { SpacesServiceSetup } from '../../../new_platform/spaces_service/spaces_service';
import { LegacyAPI } from '../../../new_platform/plugin';

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

interface RouteDeps {
  xpackMain: XPackMainPlugin;
  spacesService: SpacesServiceSetup;
  getLegacyAPI(): LegacyAPI;
  legacyRouter: Legacy.Server['route'];
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
}
