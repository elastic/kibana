/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { Server } from 'hapi';
import { Setup } from '../../helpers/setup_request';
import { getSavedObjectsClient } from '../../helpers/saved_objects_client';

const APM_UI_INDICES = [
  'apm_oss.sourcemapIndices',
  'apm_oss.errorIndices',
  'apm_oss.onboardingIndices',
  'apm_oss.spanIndices',
  'apm_oss.transactionIndices',
  'apm_oss.metricsIndices',
  'apm_oss.apmAgentConfigurationIndex'
];

export async function listUiIndices({
  setup,
  server
}: {
  setup: Setup;
  server: Server;
}) {
  const { config } = setup;

  const savedObjectsClient = getSavedObjectsClient(server, 'data');
  let attributes = {};
  try {
    const apmUiIndices = await savedObjectsClient.get(
      'apm-ui-indices',
      'apm-ui-indices'
    );
    attributes = apmUiIndices.attributes;
  } catch (err) {
    server.log('error', err);
    throw err;
  }

  return APM_UI_INDICES.map(indexConfig => ({
    configuration: indexConfig,
    defaultValue: config.get<string>(indexConfig),
    savedValue: get<typeof attributes, string | undefined>(
      attributes,
      indexConfig
    )
  }));
}
