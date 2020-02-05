/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { prefixIndexPattern } from '../ccs_utils';
import { INFRA_SOURCE_ID } from '../../../common/constants';

export const initInfraSource = (config, infraPlugin) => {
  if (infraPlugin) {
    const filebeatIndexPattern = prefixIndexPattern(
      config,
      config.get('monitoring.ui.logs.index'),
      '*'
    );
    infraPlugin.defineInternalSourceConfiguration(INFRA_SOURCE_ID, {
      name: 'Elastic Stack Logs',
      logAlias: filebeatIndexPattern,
    });
  }
};
