/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import { ElasticsearchServiceSetup } from 'kibana/server';
import { defaults, get } from 'lodash';
import { ReportingConfig } from '../../';
import { LevelLogger } from '../../lib';

const KIBANA_MAX_SIZE_BYTES_PATH = 'csv.maxSizeBytes';
const ES_MAX_SIZE_BYTES_PATH = 'http.max_content_length';

export async function validateMaxContentLength(
  config: ReportingConfig,
  elasticsearch: ElasticsearchServiceSetup,
  logger: LevelLogger
) {
  const { callAsInternalUser } = elasticsearch.legacy.client;

  const elasticClusterSettingsResponse = await callAsInternalUser('cluster.getSettings', {
    includeDefaults: true,
  });
  const { persistent, transient, defaults: defaultSettings } = elasticClusterSettingsResponse;
  const elasticClusterSettings = defaults({}, persistent, transient, defaultSettings);

  const elasticSearchMaxContent = get(elasticClusterSettings, 'http.max_content_length', '100mb');
  const elasticSearchMaxContentBytes = numeral().unformat(elasticSearchMaxContent.toUpperCase());
  const kibanaMaxContentBytes = config.get('csv', 'maxSizeBytes');

  if (kibanaMaxContentBytes > elasticSearchMaxContentBytes) {
    // TODO this should simply throw an error and let the handler conver it to a warning mesasge. See validateServerHost.
    logger.warning(
      `xpack.reporting.${KIBANA_MAX_SIZE_BYTES_PATH} (${kibanaMaxContentBytes}) is higher than ElasticSearch's ${ES_MAX_SIZE_BYTES_PATH} (${elasticSearchMaxContentBytes}). ` +
        `Please set ${ES_MAX_SIZE_BYTES_PATH} in ElasticSearch to match, or lower your xpack.reporting.${KIBANA_MAX_SIZE_BYTES_PATH} in Kibana to avoid this warning.`
    );
  }
}
