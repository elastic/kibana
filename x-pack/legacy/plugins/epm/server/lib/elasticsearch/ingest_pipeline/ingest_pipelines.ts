/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AssetReference, ElasticsearchAssetType } from '../../../../common/types';
import * as Registry from '../../../registry';
import { CallESAsCurrentUser } from '../../cluster_access';

export function rewriteIngestPipeline(
  pipeline: string,
  substitutions: Array<{
    source: string;
    target: string;
    templateFunction: string;
  }>
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

export async function installPipelines({
  callCluster,
  pkgkey,
  datasetNames,
}: {
  callCluster: CallESAsCurrentUser;
  pkgkey: string;
  datasetNames: string[];
}) {
  const paths = await Registry.getArchiveInfo(pkgkey, (entry: Registry.ArchiveEntry) =>
    isDatasetPipeline(entry, datasetNames)
  );
  const installationPromises = paths.map(path => installPipeline({ callCluster, path }));

  return Promise.all(installationPromises);
}

async function installPipeline({
  callCluster,
  path,
}: {
  callCluster: CallESAsCurrentUser;
  path: string;
}): Promise<AssetReference> {
  const buffer = Registry.getAsset(path);
  const parts = Registry.pathParts(path);
  const extension = getExtension(path);
  const id = path.replace(/\W/g, '_'); // TODO: replace with "real" pipeline id
  const pipeline = buffer.toString('utf8');

  const callClusterParams: {
    method: string;
    path: string;
    ignore: number[];
    body: any;
    headers?: any;
  } = {
    method: 'PUT',
    path: `/_ingest/pipeline/${id}`,
    ignore: [404],
    body: pipeline,
  };
  if (extension === 'yml') {
    callClusterParams.headers = { ['Content-Type']: 'application/yaml' };
  }

  // This uses the catch-all endpoint 'transport.request' because we have to explicitly
  // set the Content-Type header above for sending yml data. Setting the headers is not
  // exposed in the convenience endpoint 'ingest.putPipeline' of elasticsearch-js-legacy
  // which we could otherwise use.
  // See src/core/server/elasticsearch/api_types.ts for available endpoints.
  await callCluster('transport.request', callClusterParams);

  return { id, type: parts.type };
}

const isDirectory = ({ path }: Registry.ArchiveEntry) => path.endsWith('/');
const isDatasetPipeline = ({ path }: Registry.ArchiveEntry, datasetNames: string[]) => {
  // TODO: better way to get particular assets
  const pathParts = Registry.pathParts(path);
  return (
    !isDirectory({ path }) &&
    pathParts.type === ElasticsearchAssetType.ingestPipeline &&
    pathParts.dataset !== undefined &&
    datasetNames.includes(pathParts.dataset)
  );
};

const getExtension = (path: string): string => {
  const splitPath = path.split('.');
  return splitPath[splitPath.length - 1];
};
