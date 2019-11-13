/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash';
import { KibanaConfig } from 'src/legacy/server/kbn_server';
import { Server } from 'hapi';
import { PromiseReturnType } from '../../../../typings/common';
import {
  APM_INDICES_SAVED_OBJECT_TYPE,
  APM_INDICES_SAVED_OBJECT_ID
} from '../../../../common/apm_saved_object_constants';

export interface ApmIndicesConfig {
  'apm_oss.sourcemapIndices': string;
  'apm_oss.errorIndices': string;
  'apm_oss.onboardingIndices': string;
  'apm_oss.spanIndices': string;
  'apm_oss.transactionIndices': string;
  'apm_oss.metricsIndices': string;
  'apm_oss.apmAgentConfigurationIndex': string;
}

export type ApmIndicesName = keyof ApmIndicesConfig;

export type ScopedSavedObjectsClient = ReturnType<
  Server['savedObjects']['getScopedSavedObjectsClient']
>;

async function getApmIndicesSavedObject(
  savedObjectsClient: ScopedSavedObjectsClient
) {
  const apmIndices = await savedObjectsClient.get<Partial<ApmIndicesConfig>>(
    APM_INDICES_SAVED_OBJECT_TYPE,
    APM_INDICES_SAVED_OBJECT_ID
  );
  return apmIndices.attributes;
}

function getApmIndicesConfig(config: KibanaConfig): ApmIndicesConfig {
  return {
    'apm_oss.sourcemapIndices': config.get<string>('apm_oss.sourcemapIndices'),
    'apm_oss.errorIndices': config.get<string>('apm_oss.errorIndices'),
    'apm_oss.onboardingIndices': config.get<string>(
      'apm_oss.onboardingIndices'
    ),
    'apm_oss.spanIndices': config.get<string>('apm_oss.spanIndices'),
    'apm_oss.transactionIndices': config.get<string>(
      'apm_oss.transactionIndices'
    ),
    'apm_oss.metricsIndices': config.get<string>('apm_oss.metricsIndices'),
    'apm_oss.apmAgentConfigurationIndex': config.get<string>(
      'apm_oss.apmAgentConfigurationIndex'
    )
  };
}

export async function getApmIndices({
  savedObjectsClient,
  config
}: {
  savedObjectsClient: ScopedSavedObjectsClient;
  config: KibanaConfig;
}) {
  try {
    const apmIndicesSavedObject = await getApmIndicesSavedObject(
      savedObjectsClient
    );
    const apmIndicesConfig = getApmIndicesConfig(config);
    return merge({}, apmIndicesConfig, apmIndicesSavedObject);
  } catch (error) {
    return getApmIndicesConfig(config);
  }
}

const APM_UI_INDICES: ApmIndicesName[] = [
  'apm_oss.sourcemapIndices',
  'apm_oss.errorIndices',
  'apm_oss.onboardingIndices',
  'apm_oss.spanIndices',
  'apm_oss.transactionIndices',
  'apm_oss.metricsIndices',
  'apm_oss.apmAgentConfigurationIndex'
];

export async function getApmIndexSettings({
  config,
  savedObjectsClient
}: {
  config: KibanaConfig;
  savedObjectsClient: ScopedSavedObjectsClient;
}) {
  let apmIndicesSavedObject: PromiseReturnType<typeof getApmIndicesSavedObject>;
  try {
    apmIndicesSavedObject = await getApmIndicesSavedObject(savedObjectsClient);
  } catch (error) {
    if (error.output && error.output.statusCode === 404) {
      apmIndicesSavedObject = {};
    } else {
      throw error;
    }
  }
  const apmIndicesConfig = getApmIndicesConfig(config);

  return APM_UI_INDICES.map(configurationName => ({
    configurationName,
    defaultValue: apmIndicesConfig[configurationName], // value defined in kibana[.dev].yml
    savedValue: apmIndicesSavedObject[configurationName] // value saved via Saved Objects service
  }));
}
