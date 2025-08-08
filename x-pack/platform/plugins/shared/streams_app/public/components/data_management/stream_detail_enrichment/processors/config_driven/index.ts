/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kvProcessorConfig } from './configs/kv';
import { geoIpProcessorConfig } from './configs/geoip';
import { renameProcessorConfig } from './configs/rename';
import { setProcessorConfig } from './configs/set';
import { urlDecodeProcessorConfig } from './configs/url_decode';
import { userAgentProcessorConfig } from './configs/user_agent';

export const configDrivenProcessors = {
  kv: kvProcessorConfig,
  geoip: geoIpProcessorConfig,
  rename: renameProcessorConfig,
  set: setProcessorConfig,
  urldecode: urlDecodeProcessorConfig,
  user_agent: userAgentProcessorConfig,
};
