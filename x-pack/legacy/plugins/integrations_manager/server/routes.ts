/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObject } from 'src/core/server/saved_objects';
import { PLUGIN_ID, SAVED_OBJECT_TYPE } from '../common/constants';
import { Request, ServerRoute } from '../common/types';
import {
  API_LIST_PATTERN,
  API_INFO_PATTERN,
  API_INSTALL_PATTERN,
  API_DELETE_PATTERN,
} from '../common/routes';
import { getClient } from './saved_objects';
import { fetchInfo, fetchList, getArchiveInfo } from './registry';
import { cacheGet } from './cache';

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
    options: { tags: [`access:${PLUGIN_ID}`] },
    handler: fetchList,
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
        const toBeSavedObjects = await getDashboardObjects(pkgkey);
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
        const toBeDeletedObjects = await getDashboardObjects(pkgkey);
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

function getAsset(key: string) {
  const value: Buffer = cacheGet(key);
  const json = value.toString('utf8');
  return JSON.parse(json);
}

async function getDashboardObjects(pkgkey: string): Promise<SavedObject[]> {
  const paths = await getArchiveInfo(`${pkgkey}.tar.gz`);
  const toBeSavedObjects: Map<string, SavedObject> = new Map();

  const dashboardPaths = paths
    .filter(path => /\.json$/.test(path))
    .filter(path => /dashboard/.test(path));

  const dashboardPath = dashboardPaths[0];
  const dashboard: SavedObject = getAsset(dashboardPath);
  dashboard.type = 'dashboard';
  dashboard.id = dashboardPath.replace(`${pkgkey}/kibana/dashboard/`, '').replace('.json', '');
  if (!toBeSavedObjects.has(dashboardPath)) toBeSavedObjects.set(dashboardPath, dashboard);

  // does dashboard contain references? (e.g. to visualizations?)
  if (Array.isArray(dashboard.references)) {
    dashboard.references
      .filter(ref => ref.type === 'visualization')
      .forEach(dashDepRef => {
        const vizPath = `${pkgkey}/kibana/visualization/${dashDepRef.id}.json`;
        const viz: SavedObject = getAsset(vizPath);

        if (!toBeSavedObjects.has(vizPath)) {
          toBeSavedObjects.set(vizPath, {
            id: dashDepRef.id,
            type: dashDepRef.type,
            ...viz,
          });
        }

        // do those visualizations contain references (e.g. to index-patterns?)
        if (Array.isArray(viz.references)) {
          viz.references
            .filter(reference => reference.type === 'index-pattern')
            .forEach(vizDepRef => {
              const indexPatternsKey = `${pkgkey}/kibana/index-pattern/${vizDepRef.id}.json`;
              const pattern = getAsset(indexPatternsKey);

              if (!toBeSavedObjects.has(indexPatternsKey)) {
                toBeSavedObjects.set(indexPatternsKey, {
                  id: vizDepRef.id,
                  type: vizDepRef.type,
                  ...pattern,
                });
              }
            });
        }
      });
  }

  return Array.from(toBeSavedObjects.values(), obj => {
    // the assets from the registry are malformed
    // https://github.com/elastic/integrations-registry/issues/42
    const { attributes } = obj;
    if (
      attributes.kibanaSavedObjectMeta &&
      typeof attributes.kibanaSavedObjectMeta.searchSourceJSON !== 'string'
    ) {
      attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.stringify(
        attributes.kibanaSavedObjectMeta.searchSourceJSON
      );
    }
    ['optionsJSON', 'panelsJSON', 'uiStateJSON', 'visState']
      .filter(key => typeof attributes[key] !== 'string')
      .forEach(key => (attributes[key] = JSON.stringify(attributes[key])));
    return obj;
  });
}
