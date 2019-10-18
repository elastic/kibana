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
  getFile,
  getPackageInfo,
  getPackages,
  installPackage,
  removeInstallation,
} from './index';
import { FileRequestParams } from '../registry';

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

interface FileRequest extends Request {
  params: Request['params'] & FileRequestParams;
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

export const handleGetFile = async (req: FileRequest, extra: Extra) => {
  const response = await getFile(req.params);
  const responseWithHeaders = extra.response(response.body);
  // set the content type from the registry response
  responseWithHeaders.header('Content-Type', response.headers.get('content-type') || '');
  return responseWithHeaders;
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
