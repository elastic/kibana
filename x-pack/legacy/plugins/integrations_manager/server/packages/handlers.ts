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

interface PackageInfoRequest extends Request {
  params: {
    pkgkey: string;
  };
}

interface InstallDeletePackageRequest extends Request {
  params: {
    pkgkey: string;
    asset: AssetType;
  };
}

export async function handleGetCategories(req: Request, extra: Extra) {
  return getCategories();
}

export async function handleGetList(req: ListPackagesRequest, extra: Extra) {
  const savedObjectsClient = getClient(req);
  return getPackages({
    savedObjectsClient,
    category: req.query.category,
  });
}

export async function handleGetInfo(req: PackageInfoRequest, extra: Extra) {
  const { pkgkey } = req.params;
  const savedObjectsClient = getClient(req);
  return getPackageInfo({ savedObjectsClient, pkgkey });
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

export async function handleRequestInstall(req: InstallDeletePackageRequest, extra: Extra) {
  const { pkgkey } = req.params;
  const savedObjectsClient = getClient(req);
  return installPackage({
    savedObjectsClient,
    pkgkey,
  });
}

export async function handleRequestDelete(req: InstallDeletePackageRequest, extra: Extra) {
  const { pkgkey } = req.params;
  const savedObjectsClient = getClient(req);
  const callCluster = getClusterAccessor(extra.context.esClient, req);
  return removeInstallation({ savedObjectsClient, pkgkey, callCluster });
}
