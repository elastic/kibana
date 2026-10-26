/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  REPORTING_DATA_STREAM_ALIAS,
  REPORTING_DATA_STREAM_INDEX_TEMPLATE,
  REPORTING_INDEX_TEMPLATE_MAPPING_META_FIELD,
} from '@kbn/reporting-server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export async function rollDataStreamIfRequired(
  logger: Logger,
  esClient: ElasticsearchClient
): Promise<boolean> {
  const msgPrefix = `Data stream ${REPORTING_DATA_STREAM_ALIAS}`;
  const skipMessage = 'does not need to be rolled over';
  const rollMessage = 'rolling over the data stream';
  // easy way to change debug log level when debugging
  const debug = (msg: string) => logger.debug(msg);

  const exists = await esClient.indices.exists({
    index: REPORTING_DATA_STREAM_ALIAS,
    expand_wildcards: 'all',
  });

  if (!exists) {
    debug(`${msgPrefix} does not exist so ${skipMessage}`);
    return false;
  }

  const gotTemplate = await esClient.indices.getIndexTemplate({
    name: REPORTING_DATA_STREAM_INDEX_TEMPLATE,
  });
  if (gotTemplate.index_templates.length === 0) {
    throw new Error(
      `${msgPrefix} index template ${REPORTING_DATA_STREAM_INDEX_TEMPLATE} not found`
    );
  }

  const templateVersions: number[] = [];
  for (const template of gotTemplate.index_templates) {
    const templateVersion = template.index_template.version;
    if (templateVersion) templateVersions.push(templateVersion);
  }

  if (templateVersions.length === 0) {
    throw new Error(
      `${msgPrefix} index template ${REPORTING_DATA_STREAM_INDEX_TEMPLATE} does not have a version field`
    );
  }

  // assume the highest version is the one in use
  const templateVersion = Math.max(...templateVersions);
  debug(`${msgPrefix} template version: ${templateVersion}`);

  const mappings = await esClient.indices.getMapping({
    index: REPORTING_DATA_STREAM_ALIAS,
    allow_no_indices: true,
    expand_wildcards: 'all',
  });

  const mappingsArray = Object.values(mappings);
  if (mappingsArray.length === 0) {
    debug(`${msgPrefix} has no backing indices so ${skipMessage}`);
    return false;
  }

  // get the value of _meta.template_version from each index's mappings
  const mappingsVersions = mappingsArray
    .map((m) => m.mappings._meta?.[REPORTING_INDEX_TEMPLATE_MAPPING_META_FIELD])
    .filter((a: any): a is number => typeof a === 'number');

  const mappingsVersion = mappingsVersions.length === 0 ? undefined : Math.max(...mappingsVersions);
  debug(`${msgPrefix} mappings version: ${mappingsVersion ?? '<none>'}`);

  if (mappingsVersion === undefined) {
    // no mapping version found on any indices
    logger.info(`${msgPrefix} has no mapping versions so ${rollMessage}`);
  } else if (mappingsVersion < templateVersion) {
    // all mappings are old
    logger.info(`${msgPrefix} has older mappings than the template so ${rollMessage}`);
  } else if (mappingsVersion > templateVersion) {
    // newer mappings than the template shouldn't happen
    throw new Error(`${msgPrefix} has newer mappings than the template`);
  } else {
    // latest mappings already applied
    debug(`${msgPrefix} has latest mappings applied so ${skipMessage}`);
    return false;
  }

  // Roll over the data stream to pick up the new mappings.
  // The `lazy` option will cause the rollover to run on the next write.
  // This limits potential race conditions of multiple Kibana's rolling over at once.
  await esClient.indices.rollover({
    alias: REPORTING_DATA_STREAM_ALIAS,
    lazy: true,
  });

  logger.info(`${msgPrefix} rolled over to pick up index template version ${templateVersion}`);
  return true;
}
