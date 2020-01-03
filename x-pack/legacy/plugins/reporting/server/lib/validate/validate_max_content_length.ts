/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import numeral from '@elastic/numeral';
import { defaults, get } from 'lodash';
import { Logger, ServerFacade } from '../../../types';

const KIBANA_MAX_SIZE_BYTES_PATH = 'xpack.reporting.csv.maxSizeBytes';
const ES_MAX_SIZE_BYTES_PATH = 'http.max_content_length';

export async function validateMaxContentLength(server: ServerFacade, logger: Logger) {
  const config = server.config();
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('data');

  const elasticClusterSettingsResponse = await callWithInternalUser('cluster.getSettings', {
    includeDefaults: true,
  });
  const { persistent, transient, defaults: defaultSettings } = elasticClusterSettingsResponse;
  const elasticClusterSettings = defaults({}, persistent, transient, defaultSettings);

  const elasticSearchMaxContent = get(elasticClusterSettings, 'http.max_content_length', '100mb');
  const elasticSearchMaxContentBytes = numeral().unformat(elasticSearchMaxContent.toUpperCase());
  const kibanaMaxContentBytes: number = config.get(KIBANA_MAX_SIZE_BYTES_PATH);

  if (kibanaMaxContentBytes > elasticSearchMaxContentBytes) {
    // TODO this should simply throw an error and let the handler conver it to a warning mesasge. See validateServerHost.
    logger.warning(
      `${KIBANA_MAX_SIZE_BYTES_PATH} (${kibanaMaxContentBytes}) is higher than ElasticSearch's ${ES_MAX_SIZE_BYTES_PATH} (${elasticSearchMaxContentBytes}). ` +
        `Please set ${ES_MAX_SIZE_BYTES_PATH} in ElasticSearch to match, or lower your ${KIBANA_MAX_SIZE_BYTES_PATH} in Kibana to avoid this warning.`
    );
  }
}
