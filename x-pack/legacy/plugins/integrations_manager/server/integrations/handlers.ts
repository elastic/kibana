/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AssetType, Request, ResponseToolkit } from '../../common/types';
import { PluginContext } from '../plugin';
import { getClient } from '../saved_objects';
import {
  SearchParams,
  getCategories,
  getClusterAccessor,
  getIntegrationInfo,
  getIntegrations,
  installIntegration,
  removeInstallation,
} from './index';

interface Extra extends ResponseToolkit {
  context: PluginContext;
}

interface ListIntegrationsRequest extends Request {
  query: Request['query'] & SearchParams;
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
  asset?: AssetType;
};

export async function handleGetCategories(req: Request, extra: Extra) {
  return getCategories();
}

export async function handleGetList(req: ListIntegrationsRequest, extra: Extra) {
  const savedObjectsClient = getClient(req);
  const integrationList = await getIntegrations({
    savedObjectsClient,
    category: req.query.category,
  });

  return integrationList;
}

export async function handleGetInfo(req: PackageRequest, extra: Extra) {
  const { pkgkey } = req.params;
  const savedObjectsClient = getClient(req);
  const integrationInfo = await getIntegrationInfo({ savedObjectsClient, pkgkey });

  return integrationInfo;
}

export async function handleRequestInstall(req: InstallAssetRequest, extra: Extra) {
  const { pkgkey, asset } = req.params;
  if (!asset) throw new Error('Unhandled empty/default asset case');

  const savedObjectsClient = getClient(req);
  const callCluster = getClusterAccessor(extra.context.esClient, req);
  const object = await installIntegration({ savedObjectsClient, pkgkey, asset, callCluster });

  return object;
}

export async function handleRequestDelete(req: DeleteAssetRequest, extra: Extra) {
  const { pkgkey } = req.params;
  const savedObjectsClient = getClient(req);
  const deleted = await removeInstallation({ savedObjectsClient, pkgkey });

  return deleted;
}
