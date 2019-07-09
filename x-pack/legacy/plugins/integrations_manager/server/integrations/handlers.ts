/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsBulkGetObject } from 'src/core/server/saved_objects';
import { Request, InstallationSavedObject } from '../../common/types';
import { SAVED_OBJECT_TYPE } from '../../common/constants';
import {
  createInstallationObject,
  createIntegrationList,
  getInstallationObject,
  getObjects,
} from './index';
import * as Registry from '../registry';
import { getClient } from '../saved_objects';

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

export async function handleGetList(req: Request) {
  const registryItems = await Registry.fetchList();
  const searchObjects: SavedObjectsBulkGetObject[] = registryItems.map(({ name, version }) => ({
    type: SAVED_OBJECT_TYPE,
    id: `${name}-${version}`,
  }));
  const client = getClient(req);
  const results = await client.bulkGet(searchObjects);
  const savedObjects: InstallationSavedObject[] = results.saved_objects.filter(o => !o.error); // ignore errors for now
  const integrationList = createIntegrationList(registryItems, savedObjects);

  return integrationList;
}

export async function handleGetInfo(req: PackageRequest) {
  const { pkgkey } = req.params;
  const item = await Registry.fetchInfo(pkgkey);
  const savedObject = await getInstallationObject(getClient(req), pkgkey);
  const installation = createInstallationObject(item, savedObject);

  return installation;
}

export async function handleRequestInstall(req: InstallFeatureRequest) {
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
}

export async function handleRequestDelete(req: InstallFeatureRequest) {
  const { pkgkey, feature } = req.params;
  const client = getClient(req);

  const installation = await getInstallationObject(client, pkgkey);
  const installedObjects = (installation && installation.attributes.installed) || [];

  // Delete the manager saved object with references to the asset objects
  // could also update with [] or some other state
  await client.delete(SAVED_OBJECT_TYPE, pkgkey);

  // ASK: should the manager uninstall the assets it installed
  // or just the references in SAVED_OBJECT_TYPE?
  if (feature === 'dashboard') {
    // Delete the installed assets
    const deletePromises = installedObjects.map(async ({ id, type }) => client.delete(type, id));
    await Promise.all(deletePromises);
  }

  return {
    pkgkey,
    feature,
    deleted: installedObjects,
  };
}
