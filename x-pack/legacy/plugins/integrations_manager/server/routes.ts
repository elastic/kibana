/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PLUGIN_ID, SAVED_OBJECT_TYPE } from '../common/constants';
import { Request, ServerRoute } from '../common/types';
import {
  API_LIST_PATTERN,
  API_INFO_PATTERN,
  API_INSTALL_PATTERN,
  API_DELETE_PATTERN,
} from '../common/routes';
import { getClient } from './saved_objects';
import { fetchInfo, fetchList, getArchiveInfo, getObjects } from './registry';

interface PackageRequest extends Request {
  params: {
    pkgkey: string;
  };
}

interface InstallFeatureRequest extends PackageRequest {
  params: {
    pkgkey: string;
    feature: string;
  };
}

// Manager public API paths
export const routes: ServerRoute[] = [
  {
    method: 'GET',
    path: API_LIST_PATTERN,
    options: { tags: [`access:${PLUGIN_ID}`], json: { space: 2 } },
    handler: async (req: Request) => {
      const fromRegistry = await fetchList();
      const searchObjects = fromRegistry.map(({ name, version }) => ({
        type: SAVED_OBJECT_TYPE,
        id: `${name}-${version}`,
      }));
      const client = getClient(req);
      const results = await client.bulkGet(searchObjects);

      return results.saved_objects;
    },
  },
  {
    method: 'GET',
    path: API_INFO_PATTERN,
    options: { tags: [`access:${PLUGIN_ID}`], json: { space: 2 } },
    handler: async (req: PackageRequest) => {
      const { pkgkey } = req.params;
      const [info, paths] = await Promise.all([
        fetchInfo(pkgkey),
        getArchiveInfo(`${pkgkey}.tar.gz`),
      ]);
      // map over paths and test types from https://github.com/elastic/integrations-registry/blob/master/ASSETS.md
      const features = ['injest-pipeline', 'visualization', 'dashboard', 'index-pattern'];

      return {
        ...info,
        paths,
        features,
      };
    },
  },
  {
    method: 'GET',
    path: API_INSTALL_PATTERN,
    options: { tags: [`access:${PLUGIN_ID}`], json: { space: 2 } },
    handler: async (req: InstallFeatureRequest) => {
      const { pkgkey, feature } = req.params;

      if (feature === 'dashboard') {
        const toBeSavedObjects = await getObjects(pkgkey, feature);
        const client = getClient(req);
        const createResults = await client.bulkCreate(toBeSavedObjects, { overwrite: true });
        const installed = createResults.saved_objects.map(({ id, type }) => ({ id, type }));
        const mgrResults = await client.create(
          SAVED_OBJECT_TYPE,
          { installed },
          { id: pkgkey, overwrite: true }
        );

        return mgrResults;
      }

      return {
        pkgkey,
        feature,
        created: [],
      };
    },
  },
  {
    method: 'GET',
    path: API_DELETE_PATTERN,
    options: { tags: [`access:${PLUGIN_ID}`], json: { space: 2 } },
    handler: async (req: InstallFeatureRequest) => {
      const { pkgkey, feature } = req.params;
      const client = getClient(req);

      if (feature === 'dashboard') {
        const toBeDeletedObjects = await getObjects(pkgkey, feature);
        // ASK: should the manager uninstall the assets it installed
        // or just the references in SAVED_OBJECT_TYPE?
        const deletePromises = toBeDeletedObjects.map(async ({ id, type }) =>
          client.delete(type, id)
        );

        await Promise.all(deletePromises);

        return {
          pkgkey,
          feature,
          deleted: toBeDeletedObjects.map(({ id, type }) => ({ id, type })),
        };
      }

      const deleted = await client.delete(SAVED_OBJECT_TYPE, pkgkey);

      return {
        pkgkey,
        feature,
        deleted: deleted || [],
      };
    },
  },
];
