/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, sample } from 'lodash';
import { SERVICE_LOGS } from '../../constants';
import { GeneratorFunction } from '../../types';
import { generateService } from './lib/generate_service';
import { generateLogMessage } from './lib/generate_log_message';

export const generateEvent: GeneratorFunction = (_config, _schedule, index, timestamp) => {
  const service = generateService(index + 1);
  const { hostsWithCloud } = service;
  const hostWithCloud = sample(hostsWithCloud);
  return [
    {
      namespace: SERVICE_LOGS,
      '@timestamp': timestamp.toISOString(),
      data_stream: { type: 'logs', dataset: SERVICE_LOGS, namespace: 'default' },
      service: omit(service, 'hostsWithCloud'),
      ...hostWithCloud,
      ...generateLogMessage(timestamp),
    },
  ];
};
