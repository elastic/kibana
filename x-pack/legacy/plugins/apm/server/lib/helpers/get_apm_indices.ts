/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { isObject } from 'lodash';
import { getSavedObjectsClient } from './saved_objects_client';

interface UiIndices {
  apm_oss: {
    sourcemapIndices?: string;
    errorIndices?: string;
    onboardingIndices?: string;
    spanIndices?: string;
    transactionIndices?: string;
    metricsIndices?: string;
    apmAgentConfigurationIndex?: string;
  };
}

export async function getApmIndices(server: Server) {
  const config = server.config();

  const savedObjectsClient = getSavedObjectsClient(server, 'data');
  // eslint-disable-next-line @typescript-eslint/camelcase
  let apm_oss: UiIndices['apm_oss'] = {};
  try {
    const apmUiIndices = await savedObjectsClient.get<UiIndices>(
      'apm-ui-indices',
      'apm-ui-indices'
    );
    // eslint-disable-next-line @typescript-eslint/camelcase
    apm_oss = apmUiIndices.attributes.apm_oss;
  } catch (err) {
    server.log('error', err);
  }
  return {
    apm_oss: {
      sourcemapIndices:
        apm_oss.sourcemapIndices ||
        config.get<string>('apm_oss.sourcemapIndices'),
      errorIndices:
        apm_oss.errorIndices || config.get<string>('apm_oss.errorIndices'),
      onboardingIndices:
        apm_oss.onboardingIndices ||
        config.get<string>('apm_oss.onboardingIndices'),
      spanIndices:
        apm_oss.spanIndices || config.get<string>('apm_oss.spanIndices'),
      transactionIndices:
        apm_oss.transactionIndices ||
        config.get<string>('apm_oss.transactionIndices'),
      metricsIndices:
        apm_oss.metricsIndices || config.get<string>('apm_oss.metricsIndices'),
      apmAgentConfigurationIndex:
        apm_oss.apmAgentConfigurationIndex ||
        config.get<string>('apm_oss.apmAgentConfigurationIndex')
    }
  };
}

function flatValues<T = any>(obj: Record<string, any>, deepValues = []): T[] {
  return Object.values(obj).reduce((acc, value) => {
    if (isObject(value)) {
      return [...acc, ...flatValues(value)];
    }
    return [...acc, value];
  }, []);
}

export async function getApmIndicesList(server: Server) {
  const apmIndices = await getApmIndices(server);
  return flatValues<string>(apmIndices);
}
