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
} from './apm_ui_indices';
import { PromiseReturnType } from '../../../../typings/common';

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
  let apmUiIndicesSavedObject: PromiseReturnType<
    typeof getApmUiIndicesSavedObject
  >;
  try {
    apmUiIndicesSavedObject = await getApmUiIndicesSavedObject(server);
  } catch (error) {
    if (error.output && error.output.statusCode === 404) {
      apmUiIndicesSavedObject = { apm_oss: {} };
    } else {
      throw error;
    }
  }
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
