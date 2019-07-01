/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PLUGIN_ID } from '../common/constants';
import { Request, ServerRoute } from '../common/types';
import {
  API_LIST_PATTERN,
  API_INFO_PATTERN,
  API_TGZ_PATTERN,
  API_ZIP_PATTERN,
} from '../common/routes';
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
    path: API_LIST_PATTERN,
    options: { tags: [`access:${PLUGIN_ID}`] },
    handler: fetchList,
  },
  {
    method: 'GET',
    path: API_INFO_PATTERN,
    options: { tags: [`access:${PLUGIN_ID}`] },
    handler: async (req: PackageRequest) => fetchInfo(req.params.pkgkey),
  },
  {
    method: 'GET',
    path: API_ZIP_PATTERN,
    options: { tags: [`access:${PLUGIN_ID}`] },
    handler: async (req: PackageRequest) => {
      const { pkgkey } = req.params;
      const paths = await getArchiveInfo(`${pkgkey}.zip`);
      return { meta: { pkgkey, paths } };
    },
  },
  {
    method: 'GET',
    path: API_TGZ_PATTERN,
    options: { tags: [`access:${PLUGIN_ID}`] },
    handler: async (req: PackageRequest) => {
      const { pkgkey } = req.params;
      const paths = await getArchiveInfo(`${pkgkey}.tar.gz`);
      return { meta: { pkgkey, paths } };
    },
  },
];
