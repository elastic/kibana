/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { merge } from 'lodash';
import { KibanaConfig } from 'src/legacy/server/kbn_server';
import { getSavedObjectsClient } from '../../helpers/saved_objects_client';

interface ApmOssIndices {
  sourcemapIndices: string;
  errorIndices: string;
  onboardingIndices: string;
  spanIndices: string;
  transactionIndices: string;
  metricsIndices: string;
  apmAgentConfigurationIndex: string;
}

interface ApmUiIndicesSavedObject {
  [key: string]: any;
  apm_oss: Partial<ApmOssIndices>;
}

interface ApmUiIndicesConfig {
  apm_oss: ApmOssIndices;
}

const APM_UI_INDICES_SAVED_OBJECT_TYPE = 'apm-ui-indices';
const APM_UI_INDICES_SAVED_OBJECT_ID = 'apm-ui-indices';

export async function getApmUiIndicesSavedObject(server: Server) {
  const savedObjectsClient = getSavedObjectsClient(server, 'data');
  const apmUiIndices = await savedObjectsClient.get<ApmUiIndicesSavedObject>(
    APM_UI_INDICES_SAVED_OBJECT_TYPE,
    APM_UI_INDICES_SAVED_OBJECT_ID
  );
  return apmUiIndices.attributes;
}

export function getApmUiIndicesConfig(
  config: KibanaConfig
): ApmUiIndicesConfig {
  return {
    apm_oss: {
      sourcemapIndices: config.get<string>('apm_oss.sourcemapIndices'),
      errorIndices: config.get<string>('apm_oss.errorIndices'),
      onboardingIndices: config.get<string>('apm_oss.onboardingIndices'),
      spanIndices: config.get<string>('apm_oss.spanIndices'),
      transactionIndices: config.get<string>('apm_oss.transactionIndices'),
      metricsIndices: config.get<string>('apm_oss.metricsIndices'),
      apmAgentConfigurationIndex: config.get<string>(
        'apm_oss.apmAgentConfigurationIndex'
      )
    }
  };
}

export async function getApmIndices(server: Server) {
  try {
    const apmUiIndicesSavedObject = await getApmUiIndicesSavedObject(server);
    const apmUiIndicesConfig = getApmUiIndicesConfig(server.config());
    return merge({}, apmUiIndicesConfig, apmUiIndicesSavedObject);
  } catch (error) {
    return getApmUiIndicesConfig(server.config());
  }
}

export async function storeApmUiIndicesSavedObject(
  server: Server,
  apmUiIndicesSavedObject: ApmUiIndicesSavedObject
) {
  const savedObjectsClient = getSavedObjectsClient(server, 'data');
  return await savedObjectsClient.create(
    APM_UI_INDICES_SAVED_OBJECT_TYPE,
    apmUiIndicesSavedObject,
    {
      id: APM_UI_INDICES_SAVED_OBJECT_ID,
      overwrite: true
    }
  );
}
