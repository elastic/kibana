/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PLUGIN_ID } from '../common/constants';
import { Request, ServerRoute } from '../common/types';
import { getNamedRoute, RouteName } from '../common/routes';
import { fetchInfo, fetchList, getArchiveInfo } from './registry';

interface PackageRequest extends Request {
  params: {
    pkgkey: string;
  };
}

// Manager public API paths (currently essentially a proxy to registry service)
export const routes: ServerRoute[] = [
  {
    method: 'GET',
    path: getNamedRoute(RouteName.API_LIST).path,
    options: { tags: [`access:${PLUGIN_ID}`] },
    handler: fetchList,
  },
  {
    method: 'GET',
    path: getNamedRoute(RouteName.API_INFO).path,
    options: { tags: [`access:${PLUGIN_ID}`] },
    handler: async (req: PackageRequest) => fetchInfo(req.params.pkgkey),
  },
  {
    method: 'GET',
    path: getNamedRoute(RouteName.API_ZIP).path,
    options: { tags: [`access:${PLUGIN_ID}`] },
    handler: async (req: PackageRequest) => {
      const { pkgkey } = req.params;
      const paths = await getArchiveInfo(`${pkgkey}.zip`);
      return { meta: { pkgkey, paths } };
    },
  },
  {
    method: 'GET',
    path: getNamedRoute(RouteName.API_TGZ).path,
    options: { tags: [`access:${PLUGIN_ID}`] },
    handler: async (req: PackageRequest) => {
      const { pkgkey } = req.params;
      const paths = await getArchiveInfo(`${pkgkey}.tar.gz`);
      return { meta: { pkgkey, paths } };
    },
  },
];
