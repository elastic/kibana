/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ActionsPluginsSetup } from './shim';
import { licensePreRoutingFactory } from './lib/license_pre_routing_factory';

export function extendRouteWithLicenseCheck(route: any, plugins: ActionsPluginsSetup) {
  const licensePreRouting = licensePreRoutingFactory(plugins);

  return {
    ...route,
    ['config']: {
      ...route.config,
      pre: [licensePreRouting],
    },
  };
}
