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
  getImage,
  getPackageInfo,
  getPackages,
  installPackage,
  removeInstallation,
} from './index';
import { ImageRequestParams } from '../registry';

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

interface ImageRequest extends Request {
  params: Request['params'] & ImageRequestParams;
}

interface InstallIntegrationRequest extends Request {
  params: IntegrationRequestParams;
}

interface DeleteIntegrationRequest extends Request {
  params: IntegrationRequestParams;
}

type IntegrationRequestParams = PackageRequest['params'] & {
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

export const handleGetImage = async (req: ImageRequest, extra: Extra) => {
  const response = await getImage(req.params);
  const newResponse = extra.response(response.body);
  // set the content type from the registry response
  newResponse.header('Content-Type', response.headers.get('content-type') || '');
  return newResponse;
};

export async function handleRequestInstall(req: InstallIntegrationRequest, extra: Extra) {
  const { pkgkey, asset } = req.params;

  const savedObjectsClient = getClient(req);
  const callCluster = getClusterAccessor(extra.context.esClient, req);
  return await installPackage({
    savedObjectsClient,
    pkgkey,
    asset,
    callCluster,
  });
}

export async function handleRequestDelete(req: DeleteIntegrationRequest, extra: Extra) {
  const { pkgkey } = req.params;
  const savedObjectsClient = getClient(req);
  const deleted = await removeInstallation({ savedObjectsClient, pkgkey });

  return deleted;
}
