/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import yaml from 'js-yaml';
import { SavedObjectsClientContract } from 'src/core/server/';
import { Datasource, Stream } from '../../../ingest/server/libs/types';
import { SAVED_OBJECT_TYPE_DATASOURCES } from '../../common/constants';
import { AssetReference, Dataset, InstallationStatus, RegistryPackage } from '../../common/types';
import * as Ingest from '../ingest';
import { createInput } from '../lib/agent/agent';
import { CallESAsCurrentUser } from '../lib/cluster_access';
import { installILMPolicy, policyExists } from '../lib/elasticsearch/ilm/install';
import { installPipelinesForDataset } from '../lib/elasticsearch/ingest_pipeline/ingest_pipelines';
import { installTemplateForDataset } from '../lib/elasticsearch/template/install';
import { getPackageInfo, PackageNotInstalledError } from '../packages';
import * as Registry from '../registry';
import { Request } from '../types';

interface CreateDatasource {
  savedObjectsClient: SavedObjectsClientContract;
  callCluster: CallESAsCurrentUser;
  request: Request;
  pkgkey: string;
  datasourceName: string;
  datasets: Dataset[];
  policyIds: string[];
}
export async function createDatasource({
  savedObjectsClient,
  callCluster,
  pkgkey,
  datasets,
  datasourceName,
  request,
  policyIds,
}: CreateDatasource) {
  const epmPackageInfo = await getPackageInfo({ savedObjectsClient, pkgkey });
  if (epmPackageInfo.status !== InstallationStatus.installed) {
    throw new PackageNotInstalledError(pkgkey);
  }

  const registryPackageInfo = await Registry.fetchInfo(pkgkey);
  const installedAssetReferences = await installAssets({
    pkg: registryPackageInfo,
    datasets,
    callCluster,
    datasourceName,
  });

  // TODO: This should be moved out of the initial data source creation in the end
  await basePolicySetup(callCluster);

  const datasource = await createDatasourceObject({
    savedObjectsClient,
    pkg: registryPackageInfo,
    datasourceName,
    toSave: installedAssetReferences,
    datasets,
  });

  const savedDatasource = await Ingest.createDatasource({ request, datasource });
  const datasources = [savedDatasource.id];
  const addDatasourcesToPolicyPromises = policyIds.map(policyId =>
    Ingest.addDatasourcesToPolicy({ datasources, policyId, request })
  );
  await Promise.all(addDatasourcesToPolicyPromises);

  return installedAssetReferences;
}

/**
 * Makes the basic setup of the assets like global ILM policies. Creates them if they do
 * not exist yet but will not overwrite existing ones.
 */
async function basePolicySetup(callCluster: CallESAsCurrentUser) {
  if (!(await policyExists('logs-default', callCluster))) {
    await installILMPolicy('logs-default', callCluster);
  }
  if (!(await policyExists('metrics-default', callCluster))) {
    await installILMPolicy('metrics-default', callCluster);
  }
}

async function createDatasourceObject(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkg: RegistryPackage;
  datasourceName: string;
  toSave: AssetReference[];
  datasets: Dataset[];
}) {
  const { savedObjectsClient, pkg, toSave, datasets, datasourceName } = options;
  const savedDatasource = await getDatasource({ savedObjectsClient, name: datasourceName });
  const savedAssets = savedDatasource?.package.assets || [];
  const combinedAssets = toSave.reduce(mergeReferencesReducer, savedAssets);
  const streams = await getStreams(Registry.pkgToPkgKey(pkg), datasets);

  const datasource: Omit<Datasource, 'id'> = {
    name: datasourceName,
    read_alias: 'read_alias',
    package: {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      title: pkg.title,
      assets: combinedAssets,
    },
    streams,
  };

  return datasource;
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
  name?: Datasource['name'];
  id?: Datasource['id'];
}) {
  const { savedObjectsClient, name, id } = options;
  if (id) {
    const datasource = await savedObjectsClient.get<Datasource>(SAVED_OBJECT_TYPE_DATASOURCES, id);
    return datasource?.attributes;
  }

  if (name) {
    const results = await savedObjectsClient.find<Datasource>({
      type: SAVED_OBJECT_TYPE_DATASOURCES,
      searchFields: ['attributes.name'],
      search: name,
    });
    if (results.total === 0) {
      return;
    }

    if (results.total === 1) {
      return results.saved_objects[0]?.attributes;
    }

    if (results.total > 1) {
      throw new Error(`More than 1 datasource with name: '${name}'`);
    }
  }

  throw new Error('Must provide a data source name or id');
}

async function getConfig(pkgkey: string, dataset: Dataset): Promise<string> {
  const vars = dataset.vars;

  // This searches for the /agent/input.yml file
  const paths = await Registry.getArchiveInfo(pkgkey, (entry: Registry.ArchiveEntry) =>
    isDatasetInput(entry, dataset.name)
  );

  if (paths.length === 1 && Array.isArray(vars)) {
    const buffer = Registry.getAsset(paths[0]);
    // Load input template from path
    return createInput(vars, buffer.toString());
  }
  return '';
}

async function installAssets({
  pkg: registryPackageInfo,
  datasets,
  callCluster,
  datasourceName,
}: {
  pkg: RegistryPackage;
  datasets: Dataset[];
  callCluster: CallESAsCurrentUser;
  datasourceName: string;
}) {
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
      const templateRef = installTemplateForDataset({
        pkg: registryPackageInfo,
        callCluster,
        dataset,
        datasourceName,
      });
      if (templateRef) {
        templateRefs.push(templateRef as Promise<AssetReference>); // Typescript thinks this may still be undefined here
      }
      if (dataset.ingest_pipeline) {
        const pipelineRefArray = installPipelinesForDataset({
          pkgkey: Registry.pkgToPkgKey(registryPackageInfo),
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
  const pipelinesToSave = (await Promise.all(pipelineRefs)).flat();

  return templatesToSave.concat(pipelinesToSave);
}

const mergeReferencesReducer = (current: AssetReference[] = [], pending: AssetReference) => {
  const hasReference = current.find(c => c.id === pending.id && c.type === pending.type);
  if (!hasReference) current.push(pending);
  return current;
};

const isDatasetInput = ({ path }: Registry.ArchiveEntry, datasetName: string) => {
  const pathParts = Registry.pathParts(path);
  return !isDirectory({ path }) && pathParts.type === 'input' && pathParts.dataset === datasetName;
};

const isDirectory = ({ path }: Registry.ArchiveEntry) => path.endsWith('/');
