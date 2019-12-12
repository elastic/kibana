/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fetch from 'node-fetch';
import { SavedObjectsClientContract } from 'src/core/server/';
import { Asset, Datasource, InputType } from '../../../ingest/server/libs/types';
import { SAVED_OBJECT_TYPE_DATASOURCES } from '../../common/constants';
import { AssetReference, InstallationStatus, RegistryPackage } from '../../common/types';
import { CallESAsCurrentUser } from '../lib/cluster_access';
import { installILMPolicy, policyExists } from '../lib/elasticsearch/ilm/install';
import { installPipelines } from '../lib/elasticsearch/ingest_pipeline/ingest_pipelines';
import { installTemplates } from '../lib/elasticsearch/template/install';
import { getPackageInfo, PackageNotInstalledError } from '../packages';
import * as Registry from '../registry';
import { Request } from '../types';

export async function createDatasource(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  callCluster: CallESAsCurrentUser;
  request: Request;
}) {
  const { savedObjectsClient, pkgkey, callCluster, request } = options;
  const packageInfo = await getPackageInfo({ savedObjectsClient, pkgkey });

  if (packageInfo.status !== InstallationStatus.installed) {
    throw new PackageNotInstalledError(pkgkey);
  }

  const toSave = await installPipelines({ pkgkey, callCluster });

  // TODO: This should be moved out of the initial data source creation in the end
  await baseSetup(callCluster);
  const pkg = await Registry.fetchInfo(pkgkey);

  await Promise.all([
    installTemplates(pkg, callCluster),
    saveDatasourceReferences({
      savedObjectsClient,
      pkg,
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
  toSave: AssetReference[];
  request: Request;
}) {
  const { savedObjectsClient, pkg, toSave, request } = options;
  const savedDatasource = await getDatasource({ savedObjectsClient, pkg });
  const savedAssets = savedDatasource?.package.assets;
  const assetsReducer = (current: Asset[] = [], pending: Asset) => {
    const hasAsset = current.find(c => c.id === pending.id && c.type === pending.type);
    if (!hasAsset) current.push(pending);
    return current;
  };

  const toInstall = (toSave as Asset[]).reduce(assetsReducer, savedAssets);
  const datasource: Datasource = createFakeDatasource(pkg, toInstall);
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

function createFakeDatasource(pkg: RegistryPackage, assets: Asset[] = []): Datasource {
  return {
    id: Registry.pkgToPkgKey(pkg),
    name: 'name',
    read_alias: 'read_alias',
    package: {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      title: pkg.title,
      assets,
    },
    streams: [
      {
        id: 'string',
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
      },
    ],
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
  // The key here is to show the Saved Object we create being stored/retrieved by Inges
  const base = `http://${request.headers.host}`;
  const url = `${base}/api/ingest/datasources`;
  const body = { datasource };

  return fetch(url, {
    method: 'post',
    body: JSON.stringify(body),
    headers: {
      'kbn-xsrf': 'some value, any value',
      'Content-Type': 'application/json',
      ...request.headers,
    },
  }).then(response => response.json());
}
