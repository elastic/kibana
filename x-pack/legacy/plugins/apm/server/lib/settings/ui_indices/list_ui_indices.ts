/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { Server } from 'hapi';
import { Setup } from '../../helpers/setup_request';
import {
  getApmUiIndicesSavedObject,
  getApmUiIndicesConfig
} from '../../helpers/apm_ui_indices';

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
  const apmUiIndicesSavedObject = await getApmUiIndicesSavedObject(server);
  const apmUiIndicesConfig = getApmUiIndicesConfig(config);

  return APM_UI_INDICES.map(configurationName => ({
    configuration: configurationName,
    defaultValue: get<typeof apmUiIndicesConfig, string>(
      apmUiIndicesConfig,
      configurationName
    ),
    savedValue: get<typeof apmUiIndicesSavedObject, string | undefined>(
      apmUiIndicesSavedObject,
      configurationName
    )
  }));
}
