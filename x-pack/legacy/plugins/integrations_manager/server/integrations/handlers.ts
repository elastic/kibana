/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, InstallationSavedObject } from '../../common/types';
import { ArchiveEntry, pathParts } from '../registry';
import { getClient } from '../saved_objects';
import { getIntegrations, getIntegrationInfo, installAssets, removeInstallation } from './data';

interface PackageRequest extends Request {
  params: {
    pkgkey: string;
  };
}

interface InstallAssetRequest extends PackageRequest {
  params: PackageRequest['params'] & {
    asset: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DeleteAssetRequest extends InstallAssetRequest {}

export async function handleGetList(req: Request) {
  const client = getClient(req);
  const integrationList = await getIntegrations(client);

  return integrationList;
}

export async function handleGetInfo(req: PackageRequest) {
  const { pkgkey } = req.params;
  const client = getClient(req);
  const installation = await getIntegrationInfo(client, pkgkey);

  return installation;
}

export async function handleRequestInstall(req: InstallAssetRequest) {
  const { pkgkey, asset } = req.params;
  const created: InstallationSavedObject[] = [];

  if (asset === 'dashboard') {
    const client = getClient(req);
    const object = await installAssets(client, pkgkey, (entry: ArchiveEntry) => {
      const { type } = pathParts(entry.path);
      return type === asset;
    });

    created.push(object);
  }

  return {
    pkgkey,
    asset,
    created,
  };
}

export async function handleRequestDelete(req: DeleteAssetRequest) {
  const { pkgkey, asset } = req.params;
  const client = getClient(req);
  const deleted = await removeInstallation(client, pkgkey);

  return {
    pkgkey,
    asset,
    deleted,
  };
}
