/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';

import { CallClusterWithRequest } from 'src/legacy/core_plugins/elasticsearch';
import { RequestShim } from '../types';

interface DeprecationLoggingStatus {
  isEnabled: boolean;
}

export async function getDeprecationLoggingStatus(
  callWithRequest: CallClusterWithRequest,
  req: RequestShim
): Promise<DeprecationLoggingStatus> {
  const response = await callWithRequest(req, 'cluster.getSettings', {
    includeDefaults: true,
  });

  return {
    isEnabled: isDeprecationLoggingEnabled(response),
  };
}

export async function setDeprecationLogging(
  callWithRequest: CallClusterWithRequest,
  req: RequestShim,
  isEnabled: boolean
): Promise<DeprecationLoggingStatus> {
  const response = await callWithRequest(req, 'cluster.putSettings', {
    body: {
      transient: {
        'logger.deprecation': isEnabled ? 'WARN' : 'ERROR',
      },
    },
  });

  return {
    isEnabled: isDeprecationLoggingEnabled(response),
  };
}

export function isDeprecationLoggingEnabled(settings: any) {
  const deprecationLogLevel = ['default', 'persistent', 'transient'].reduce(
    (currentLogLevel, settingsTier) =>
      get(settings, [settingsTier, 'logger', 'deprecation'], currentLogLevel),
    'WARN'
  );

  return ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN'].includes(deprecationLogLevel);
}
