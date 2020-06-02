/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingConfig } from '../../../server';
import { ConditionalHeaders } from '../../../server/types';

export const getConditionalHeaders = <JobDocPayloadType>({
  config,
  job,
  filteredHeaders,
}: {
  config: ReportingConfig;
  job: JobDocPayloadType;
  filteredHeaders: Record<string, string>;
}) => {
  const { kbnConfig } = config;
  const [hostname, port, basePath, protocol] = [
    config.get('kibanaServer', 'hostname'),
    config.get('kibanaServer', 'port'),
    kbnConfig.get('server', 'basePath'),
    config.get('kibanaServer', 'protocol'),
  ] as [string, number, string, string];

  const conditionalHeaders: ConditionalHeaders = {
    headers: filteredHeaders,
    conditions: {
      hostname: hostname ? hostname.toLowerCase() : hostname,
      port,
      basePath,
      protocol,
    },
  };

  return conditionalHeaders;
};
