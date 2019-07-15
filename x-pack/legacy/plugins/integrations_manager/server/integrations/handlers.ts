/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, ResponseToolkit } from '../../common/types';
import { PluginContext } from '../plugin';
import { getClient } from '../saved_objects';
import {
  getClusterAccessor,
  getIntegrations,
  getIntegrationInfo,
  installIntegration,
  removeInstallation,
} from './data';

interface Extra extends ResponseToolkit {
  context: PluginContext;
}

interface PackageRequest extends Request {
  params: {
    pkgkey: string;
  };
}

interface InstallAssetRequest extends Request {
  params: AssetRequestParams;
}

interface DeleteAssetRequest extends Request {
  params: AssetRequestParams;
}

type AssetRequestParams = PackageRequest['params'] & {
  asset?: string;
};

export async function handleGetList(req: Request, extra: Extra) {
  const client = getClient(req);
  const integrationList = await getIntegrations(client);

  return integrationList;
}

export async function handleGetInfo(req: PackageRequest, extra: Extra) {
  const { pkgkey } = req.params;
  const client = getClient(req);
  const integrationInfo = await getIntegrationInfo(client, pkgkey);

  return integrationInfo;
}

export async function handleRequestInstall(req: InstallAssetRequest, extra: Extra) {
  const { pkgkey, asset } = req.params;
  if (!asset) throw new Error('Unhandled empty/default asset case');

  const client = getClient(req);
  const callESEndpoint = getClusterAccessor(extra.context.esClient, req);
  const object = await installIntegration(client, pkgkey, asset, callESEndpoint);

  return object;
}

export async function handleRequestDelete(req: DeleteAssetRequest, extra: Extra) {
  const { pkgkey } = req.params;
  const client = getClient(req);
  const deleted = await removeInstallation(client, pkgkey);

  return deleted;
}
