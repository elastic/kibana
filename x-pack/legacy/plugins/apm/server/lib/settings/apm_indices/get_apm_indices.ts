/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash';
import { Server } from 'hapi';
import { SavedObjectsClientContract } from 'kibana/server';
import { PromiseReturnType } from '../../../../typings/common';
import {
  APM_INDICES_SAVED_OBJECT_TYPE,
  APM_INDICES_SAVED_OBJECT_ID
} from '../../../../common/apm_saved_object_constants';
import { APMConfig } from '../../../../../../../plugins/apm/server';
import { APMRequestHandlerContext } from '../../../routes/typings';

export interface ApmIndicesConfig {
  'apm_oss.sourcemapIndices': string;
  'apm_oss.errorIndices': string;
  'apm_oss.onboardingIndices': string;
  'apm_oss.spanIndices': string;
  'apm_oss.transactionIndices': string;
  'apm_oss.metricsIndices': string;
  apmAgentConfigurationIndex: string;
  apmServiceConnectionsIndex: string;
}

export type ApmIndicesName = keyof ApmIndicesConfig;

export type ScopedSavedObjectsClient = ReturnType<
  Server['savedObjects']['getScopedSavedObjectsClient']
>;

async function getApmIndicesSavedObject(
  savedObjectsClient: SavedObjectsClientContract
) {
  const apmIndices = await savedObjectsClient.get<Partial<ApmIndicesConfig>>(
    APM_INDICES_SAVED_OBJECT_TYPE,
    APM_INDICES_SAVED_OBJECT_ID
  );
  return apmIndices.attributes;
}

export function getApmIndicesConfig(config: APMConfig): ApmIndicesConfig {
  return {
    'apm_oss.sourcemapIndices': config['apm_oss.sourcemapIndices'],
    'apm_oss.errorIndices': config['apm_oss.errorIndices'],
    'apm_oss.onboardingIndices': config['apm_oss.onboardingIndices'],
    'apm_oss.spanIndices': config['apm_oss.spanIndices'],
    'apm_oss.transactionIndices': config['apm_oss.transactionIndices'],
    'apm_oss.metricsIndices': config['apm_oss.metricsIndices'],
    // system indices, not configurable
    apmAgentConfigurationIndex: '.apm-agent-configuration',
    apmServiceConnectionsIndex: 'apm-service-connections'
  };
}

export async function getApmIndices({
  config,
  savedObjectsClient
}: {
  config: APMConfig;
  savedObjectsClient: SavedObjectsClientContract;
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
  'apm_oss.metricsIndices'
];

export async function getApmIndexSettings({
  context
}: {
  context: APMRequestHandlerContext;
}) {
  let apmIndicesSavedObject: PromiseReturnType<typeof getApmIndicesSavedObject>;
  try {
    apmIndicesSavedObject = await getApmIndicesSavedObject(
      context.core.savedObjects.client
    );
  } catch (error) {
    if (error.output && error.output.statusCode === 404) {
      apmIndicesSavedObject = {};
    } else {
      throw error;
    }
  }
  const apmIndicesConfig = getApmIndicesConfig(context.config);

  return APM_UI_INDICES.map(configurationName => ({
    configurationName,
    defaultValue: apmIndicesConfig[configurationName], // value defined in kibana[.dev].yml
    savedValue: apmIndicesSavedObject[configurationName] // value saved via Saved Objects service
  }));
}
