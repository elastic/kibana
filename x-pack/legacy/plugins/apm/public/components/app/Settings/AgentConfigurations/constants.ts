/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ALL_OPTION_VALUE = 'ALL_OPTION_VALUE';

export const ALL_OPTION_LABEL = i18n.translate(
  'xpack.apm.settings.agentConf.allOptionLabel',
  { defaultMessage: 'All' }
);

export function getOptionLabel(value: string | undefined) {
  return value === undefined || value === ALL_OPTION_VALUE
    ? ALL_OPTION_LABEL
    : value;
}

export function getOptionValue(value: string) {
  return value === ALL_OPTION_VALUE ? undefined : value;
}
