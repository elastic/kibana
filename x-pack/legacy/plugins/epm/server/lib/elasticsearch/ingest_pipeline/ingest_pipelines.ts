/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallESAsCurrentUser } from '../../cluster_access';
import * as Registry from '../../../registry';
import { AssetReference, ElasticsearchAssetType } from '../../../../common/types';

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
}: {
  callCluster: CallESAsCurrentUser;
  pkgkey: string;
}) {
  const paths = await Registry.getArchiveInfo(pkgkey, isPipeline);
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
  const id = path.replace(/\W/g, '_'); // TODO: replace with "real" pipeline id
  const pipeline = buffer.toString('utf8');

  await callCluster('ingest.putPipeline', { id, body: pipeline });

  return { id, type: parts.type };
}

const isDirectory = ({ path }: Registry.ArchiveEntry) => path.endsWith('/');
const isPipeline = ({ path }: Registry.ArchiveEntry) =>
  !isDirectory({ path }) && Registry.pathParts(path).type === ElasticsearchAssetType.ingestPipeline;
