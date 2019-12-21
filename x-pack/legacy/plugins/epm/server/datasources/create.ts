/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fetch from 'node-fetch';
import yaml from 'js-yaml';
import { SavedObjectsClientContract } from 'src/core/server/';
import { Asset, Datasource, Stream } from '../../../ingest/server/libs/types';
import { SAVED_OBJECT_TYPE_DATASOURCES } from '../../common/constants';
import { AssetReference, Dataset, InstallationStatus, RegistryPackage } from '../../common/types';
import { CallESAsCurrentUser } from '../lib/cluster_access';
import { installILMPolicy, policyExists } from '../lib/elasticsearch/ilm/install';
import { installPipelinesForDataset } from '../lib/elasticsearch/ingest_pipeline/ingest_pipelines';
import { installTemplateForDataset } from '../lib/elasticsearch/template/install';
import { getPackageInfo, PackageNotInstalledError } from '../packages';
import * as Registry from '../registry';
import { Request } from '../types';
import { createInput } from '../lib/agent/agent';

export async function createDatasource(options: {
  savedObjectsClient: SavedObjectsClientContract;
  callCluster: CallESAsCurrentUser;
  request: Request;
  pkgkey: string;
  datasourceName: string;
  datasets: Dataset[];
}) {
  const { savedObjectsClient, callCluster, pkgkey, datasets, datasourceName, request } = options;

  const epmPackageInfo = await getPackageInfo({ savedObjectsClient, pkgkey });
  if (epmPackageInfo.status !== InstallationStatus.installed) {
    throw new PackageNotInstalledError(pkgkey);
  }

  const registryPackageInfo = await Registry.fetchInfo(pkgkey);
  // Pick the full dataset definition for each dataset name that has been requested
  // from the package information from the registry.
  // Requested dataset names that don't exist in the package will be silently ignored.
  const datasetsRequestedNames = datasets.map(d => d.name);
  const datasetsRequested = registryPackageInfo.datasets?.filter(packageDataset => {
    return datasetsRequestedNames.includes(packageDataset.name);
  });

  const templateRefs: Array<Promise<AssetReference>> = [];
  const pipelineRefs: Array<Promise<AssetReference[]>> = [];

  if (datasetsRequested) {
    datasetsRequested.forEach(dataset => {
      // add package name to dataset
      dataset.packageName = registryPackageInfo.name;
      const templateRef = installTemplateForDataset(
        registryPackageInfo,
        callCluster,
        dataset,
        datasourceName
      );
      if (templateRef) {
        templateRefs.push(templateRef as Promise<AssetReference>); // Typescript thinks this may still be undefined here
      }
      if (dataset.ingest_pipeline) {
        const pipelineRefArray = installPipelinesForDataset({
          pkgkey,
          dataset,
          callCluster,
          datasourceName,
          packageName: registryPackageInfo.name,
        });
        pipelineRefs.push(pipelineRefArray);
      }
    });
  }
  // the promises from template installation resolve to template references
  const templatesToSave = await Promise.all(templateRefs);
  // the promises from pipeline installation resolve to arrays of pipeline references
  const pipelinesToSave = (await Promise.all(pipelineRefs)).reduce((a, b) => a.concat(b));

  const toSave = templatesToSave.concat(pipelinesToSave);

  // TODO: This should be moved out of the initial data source creation in the end
  await baseSetup(callCluster);

  const streams = await getStreams(pkgkey, datasets);

  await saveDatasourceReferences({
    savedObjectsClient,
    pkg: registryPackageInfo,
    datasourceName,
    datasets,
    toSave,
    request,
    streams,
  });

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
  streams: Stream[];
}) {
  const { savedObjectsClient, pkg, toSave, datasets, datasourceName, request, streams } = options;
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
    streams,
  });

  // ideally we'd call .create from /x-pack/legacy/plugins/ingest/server/libs/datasources.ts#L22
  // or something similar, but it's a class not an object so many pieces are missing
  // we'd still need `user` from the request object, but that's not terrible
  // lacking that we make another http request to Ingest
  await ingestDatasourceCreate({ request, datasource });

  return toInstall;
}

async function getStreams(pkgkey: string, datasets: Dataset[]) {
  const streams: Stream[] = [];
  if (datasets) {
    for (const dataset of datasets) {
      const input = yaml.load(await getConfig(pkgkey, dataset));
      if (input) {
        streams.push({
          id: dataset.name,
          input,
          output_id: 'default',
        });
      }
    }
  }
  return streams;
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

interface CreateFakeDatasource {
  pkg: RegistryPackage;
  datasourceName: string;
  datasets: Dataset[];
  assets: Asset[] | undefined;
  streams: Stream[];
}

function createFakeDatasource({
  pkg,
  datasourceName,
  datasets,
  assets = [],
  streams,
}: CreateFakeDatasource): Datasource {
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
  await fetch(url, {
    method: 'post',
    body: JSON.stringify(body),
    headers: {
      'kbn-xsrf': 'some value, any value',
      'Content-Type': 'application/json',
      // the main (only?) one we want is `authorization`
      ...request.headers,
    },
  });
}

async function getConfig(pkgkey: string, dataset: Dataset): Promise<string> {
  const vars = dataset.vars;

  // This searches for the /agent/input.yml file
  const paths = await Registry.getArchiveInfo(pkgkey, (entry: Registry.ArchiveEntry) =>
    isDatasetInput(entry, dataset.name)
  );

  if (paths.length === 1) {
    const buffer = Registry.getAsset(paths[0]);
    // Load input template from path
    return createInput(vars, buffer.toString());
  }
  return '';
}

const isDatasetInput = ({ path }: Registry.ArchiveEntry, datasetName: string) => {
  const pathParts = Registry.pathParts(path);
  return !isDirectory({ path }) && pathParts.type === 'input' && pathParts.dataset === datasetName;
};

const isDirectory = ({ path }: Registry.ArchiveEntry) => path.endsWith('/');
