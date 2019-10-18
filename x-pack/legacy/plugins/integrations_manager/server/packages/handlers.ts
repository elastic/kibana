/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AssetType, Request, ResponseToolkit } from '../../common/types';
import { API_ROOT } from '../../common/routes';
import { PluginContext } from '../plugin';
import { getClient } from '../saved_objects';
import {
  SearchParams,
  getCategories,
  getClusterAccessor,
  getFile,
  getPackageInfo,
  getPackages,
  installPackage,
  removeInstallation,
} from './index';

interface Extra extends ResponseToolkit {
  context: PluginContext;
}

interface ListPackagesRequest extends Request {
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

export async function handleGetList(req: ListPackagesRequest, extra: Extra) {
  const savedObjectsClient = getClient(req);
  const packageList = await getPackages({
    savedObjectsClient,
    category: req.query.category,
  });

  return packageList;
}

export async function handleGetInfo(req: PackageRequest, extra: Extra) {
  const { pkgkey } = req.params;
  const savedObjectsClient = getClient(req);
  const packageInfo = await getPackageInfo({ savedObjectsClient, pkgkey });

  return packageInfo;
}

export const handleGetFile = async (req: Request, extra: Extra) => {
  if (!req.url.path) throw new Error('path is required');
  const filePath = req.url.path.replace(API_ROOT, '');
  const registryResponse = await getFile(filePath);
  const epmResponse = extra.response(registryResponse.body);
  const proxiedHeaders = ['Content-Type'];
  proxiedHeaders.forEach(key => {
    const value = registryResponse.headers.get(key);
    if (value !== null) epmResponse.header(key, value);
  });

  return epmResponse;
};

export async function handleRequestInstall(req: InstallAssetRequest, extra: Extra) {
  const { pkgkey, asset } = req.params;
  if (!asset) throw new Error('Unhandled empty/default asset case');

  const savedObjectsClient = getClient(req);
  const callCluster = getClusterAccessor(extra.context.esClient, req);
  const object = await installPackage({
    savedObjectsClient,
    pkgkey,
    asset,
    callCluster,
  });

  return object;
}

export async function handleRequestDelete(req: DeleteAssetRequest, extra: Extra) {
  const { pkgkey } = req.params;
  const savedObjectsClient = getClient(req);
  const deleted = await removeInstallation({ savedObjectsClient, pkgkey });

  return deleted;
}
