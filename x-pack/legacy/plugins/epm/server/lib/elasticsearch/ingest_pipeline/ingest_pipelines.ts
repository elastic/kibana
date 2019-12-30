/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AssetType } from '../../../../../ingest/server/libs/types';
import { AssetReference, Dataset, ElasticsearchAssetType } from '../../../../common/types';
import * as Registry from '../../../registry';
import { CallESAsCurrentUser } from '../../cluster_access';

interface RewriteSubstitution {
  source: string;
  target: string;
  templateFunction: string;
}

export function rewriteIngestPipeline(
  pipeline: string,
  substitutions: RewriteSubstitution[]
): string {
  substitutions.forEach(sub => {
    const { source, target, templateFunction } = sub;
    // This fakes the use of the golang text/template expression {{SomeTemplateFunction 'some-param'}}
    // cf. https://github.com/elastic/beats/blob/master/filebeat/fileset/fileset.go#L294

    // "Standard style" uses '{{' and '}}' as delimiters
    const matchStandardStyle = `{{\\s?${templateFunction}\\s+['"]${source}['"]\\s?}}`;
    // "Beats style" uses '{<' and '>}' as delimiters because this is current practice in the beats project
    const matchBeatsStyle = `{<\\s?${templateFunction}\\s+['"]${source}['"]\\s?>}`;

    const regexStandardStyle = new RegExp(matchStandardStyle);
    const regexBeatsStyle = new RegExp(matchBeatsStyle);
    pipeline = pipeline.replace(regexStandardStyle, target).replace(regexBeatsStyle, target);
  });
  return pipeline;
}

export async function installPipelinesForDataset({
  callCluster,
  pkgkey,
  dataset,
  datasourceName,
  packageName,
}: {
  callCluster: CallESAsCurrentUser;
  pkgkey: string;
  dataset: Dataset;
  datasourceName: string;
  packageName: string;
}): Promise<AssetReference[]> {
  const pipelinePaths = await Registry.getArchiveInfo(pkgkey, (entry: Registry.ArchiveEntry) =>
    isDatasetPipeline(entry, dataset.name)
  );
  let pipelines: any[] = [];
  const substitutions: RewriteSubstitution[] = [];

  pipelinePaths.forEach(path => {
    const { name, extension } = getNameAndExtension(path);
    const nameForInstallation = getPipelineNameForInstallation({
      pipelineName: name,
      dataset,
      datasourceName,
      packageName,
    });
    const content = Registry.getAsset(path).toString('utf-8');
    pipelines.push({
      name,
      nameForInstallation,
      content,
      extension,
    });
    substitutions.push({
      source: name,
      target: nameForInstallation,
      templateFunction: 'IngestPipeline',
    });
  });

  pipelines = pipelines.map(pipeline => {
    return {
      ...pipeline,
      contentForInstallation: rewriteIngestPipeline(pipeline.content, substitutions),
    };
  });

  const installationPromises = pipelines.map(async pipeline => {
    return installPipeline({ callCluster, pipeline });
  });

  return Promise.all(installationPromises);
}

async function installPipeline({
  callCluster,
  pipeline,
}: {
  callCluster: CallESAsCurrentUser;
  pipeline: any;
}): Promise<AssetReference> {
  const callClusterParams: {
    method: string;
    path: string;
    ignore: number[];
    body: any;
    headers?: any;
  } = {
    method: 'PUT',
    path: `/_ingest/pipeline/${pipeline.nameForInstallation}`,
    ignore: [404],
    body: pipeline.contentForInstallation,
  };
  if (pipeline.extension === 'yml') {
    callClusterParams.headers = { ['Content-Type']: 'application/yaml' };
  }

  // This uses the catch-all endpoint 'transport.request' because we have to explicitly
  // set the Content-Type header above for sending yml data. Setting the headers is not
  // exposed in the convenience endpoint 'ingest.putPipeline' of elasticsearch-js-legacy
  // which we could otherwise use.
  // See src/core/server/elasticsearch/api_types.ts for available endpoints.
  await callCluster('transport.request', callClusterParams);
  return { id: pipeline.name, type: AssetType.IngestPipeline };
}

const isDirectory = ({ path }: Registry.ArchiveEntry) => path.endsWith('/');
const isDatasetPipeline = ({ path }: Registry.ArchiveEntry, datasetName: string) => {
  // TODO: better way to get particular assets
  const pathParts = Registry.pathParts(path);
  return (
    !isDirectory({ path }) &&
    pathParts.type === ElasticsearchAssetType.ingestPipeline &&
    pathParts.dataset !== undefined &&
    datasetName === pathParts.dataset
  );
};

// XXX: assumes path/to/file.ext -- 0..n '/' and exactly one '.'
const getNameAndExtension = (
  path: string
): {
  name: string;
  extension: string;
} => {
  const splitPath = path.split('/');
  const filename = splitPath[splitPath.length - 1];
  return {
    name: filename.split('.')[0],
    extension: filename.split('.')[1],
  };
};

export const getPipelineNameForInstallation = ({
  pipelineName,
  dataset,
  datasourceName,
  packageName,
}: {
  pipelineName: string;
  dataset: Dataset;
  datasourceName: string;
  packageName: string;
}): string => {
  return `${dataset.type}-${packageName}-${datasourceName}-${dataset.name}-${pipelineName}`;
};
