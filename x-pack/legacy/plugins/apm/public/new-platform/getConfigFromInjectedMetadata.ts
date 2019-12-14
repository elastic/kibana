/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
import { ConfigSchema } from './plugin';

const { core } = npStart;

export function getConfigFromInjectedMetadata(): ConfigSchema {
  const {
    apmIndexPatternTitle,
    apmServiceMapEnabled,
    apmUiEnabled
  } = core.injectedMetadata.getInjectedVars();

  return {
    indexPatternTitle: `${apmIndexPatternTitle}`,
    serviceMapEnabled: !!apmServiceMapEnabled,
    ui: { enabled: !!apmUiEnabled }
  };
}
