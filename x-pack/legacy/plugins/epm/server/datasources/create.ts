/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fetch from 'node-fetch';
import { SavedObjectsClientContract } from 'src/core/server/';
import { Asset, Datasource, InputType } from '../../../ingest/server/libs/types';
import { SAVED_OBJECT_TYPE_DATASOURCES } from '../../common/constants';
import {
  AssetReference,
  InstallationStatus,
  RegistryPackage,
  CreateFakeDatasource,
  Dataset,
} from '../../common/types';
import { CallESAsCurrentUser } from '../lib/cluster_access';
import { installILMPolicy, policyExists } from '../lib/elasticsearch/ilm/install';
import { installPipelines } from '../lib/elasticsearch/ingest_pipeline/ingest_pipelines';
// import { installTemplates } from '../lib/elasticsearch/template/install';
import { getPackageInfo, PackageNotInstalledError } from '../packages';
import * as Registry from '../registry';
import { Request } from '../types';

export async function createDatasource(options: {
  savedObjectsClient: SavedObjectsClientContract;
  callCluster: CallESAsCurrentUser;
  request: Request;
  pkgkey: string;
  datasourceName: string;
  datasets: Dataset[];
}) {
  const { savedObjectsClient, callCluster, pkgkey, datasets, datasourceName, request } = options;
  const packageInfo = await getPackageInfo({ savedObjectsClient, pkgkey });
  if (packageInfo.status !== InstallationStatus.installed) {
    throw new PackageNotInstalledError(pkgkey);
  }
  const datasetNames = datasets.map(d => d.name);
  const toSave = await installPipelines({ pkgkey, datasetNames, callCluster });

  // TODO: This should be moved out of the initial data source creation in the end
  await baseSetup(callCluster);
  const pkg = await Registry.fetchInfo(pkgkey);

  await Promise.all([
    // installTemplates(pkg, callCluster),
    saveDatasourceReferences({
      savedObjectsClient,
      pkg,
      datasourceName,
      datasets,
      toSave,
      request,
    }),
  ]);

  return toSave;
}

/**
 * Makes the basic setup of the assets like global ILM policies. Creates them if they do
 * not exist yet but will not overwrite existing once.
 */
async function baseSetup(callCluster: CallESAsCurrentUser) {
  if (!(await policyExists('logs-default', callCluster))) {
    await installILMPolicy('logs-default', callCluster);
  }
  if (!(await policyExists('metrics-default', callCluster))) {
    await installILMPolicy('metrics-default', callCluster);
  }
}

async function saveDatasourceReferences(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkg: RegistryPackage;
  datasets: Dataset[];
  datasourceName: string;
  toSave: AssetReference[];
  request: Request;
}) {
  const { savedObjectsClient, pkg, toSave, datasets, datasourceName, request } = options;
  const savedDatasource = await getDatasource({ savedObjectsClient, pkg });
  const savedAssets = savedDatasource?.package.assets;
  const assetsReducer = (current: Asset[] = [], pending: Asset) => {
    const hasAsset = current.find(c => c.id === pending.id && c.type === pending.type);
    if (!hasAsset) current.push(pending);
    return current;
  };

  const toInstall = (toSave as Asset[]).reduce(assetsReducer, savedAssets);
  const datasource: Datasource = createFakeDatasource({
    pkg,
    datasourceName,
    datasets,
    assets: toInstall,
  });
  // ideally we'd call .create from /x-pack/legacy/plugins/ingest/server/libs/datasources.ts#L22
  // or something similar, but it's a class not an object so many pieces are missing
  // we'd still need `user` from the request object, but that's not terrible
  // lacking that we make another http request to Ingest
  await ingestDatasourceCreate({ request, datasource });

  return toInstall;
}

async function getDatasource(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkg: RegistryPackage;
}) {
  const { savedObjectsClient, pkg } = options;
  const datasource = await savedObjectsClient
    .get<Datasource>(SAVED_OBJECT_TYPE_DATASOURCES, Registry.pkgToPkgKey(pkg))
    .catch(e => undefined);

  return datasource?.attributes;
}

function createFakeDatasource({
  pkg,
  datasourceName,
  datasets,
  assets = [],
}: CreateFakeDatasource): Datasource {
  const streams = datasets.map(dataset => ({
    id: dataset.name,
    input: {
      type: InputType.Log,
      config: { config: 'values', go: 'here' },
      ingest_pipelines: ['string'],
      id: 'string',
      index_template: 'string',
      ilm_policy: 'string',
      fields: [{}],
    },
    config: { config: 'values', go: 'here' },
    output_id: 'output_id',
    processors: ['string'],
  }));
  return {
    id: Registry.pkgToPkgKey(pkg),
    name: datasourceName,
    read_alias: 'read_alias',
    package: {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      title: pkg.title,
      assets,
    },
    streams,
  };
}

async function ingestDatasourceCreate({
  request,
  datasource,
}: {
  request: Request;
  datasource: Datasource;
}) {
  // OMG, so gross! Will not keep
  // if we end up keeping the "make another HTTP request" method,
  // we'll clean this up via proxy or something else which prevents these functions from needing to know this.
  // The key here is to show the Saved Object we create being stored/retrieved by Ingest

  // node-fetch requires absolute urls because there isn't an origin on Node
  const origin = request.server.info.uri; // e.g. http://localhost:5601
  const basePath = request.getBasePath(); // e.g. /abc
  const apiPath = '/api/ingest/datasources';
  const url = `${origin}${basePath}${apiPath}`;
  const body = { datasource };
  delete request.headers['transfer-encoding'];
  return fetch(url, {
    method: 'post',
    body: JSON.stringify(body),
    headers: {
      'kbn-xsrf': 'some value, any value',
      'Content-Type': 'application/json',
      // the main (only?) one we want is `authorization`
      ...request.headers,
    },
  }).then(response => response.json());
}
