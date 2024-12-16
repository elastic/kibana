/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SUCCESS_MESSAGE = (totalAttacks: number) =>
  i18n.translate('xpack.elasticAssistant.attackDiscovery.statusSuccess', {
    values: { totalAttacks },
    defaultMessage:
      'The connector has updated with {totalAttacks} potential {totalAttacks, plural, =1 {attack} other {attacks}}',
  });

export const IN_PROGRESS_MESSAGE = i18n.translate(
  'xpack.elasticAssistant.attackDiscovery.statusInProgress',
  {
    defaultMessage: 'Attack discovery generation in progress.',
  }
);

export const FAILURE_MESSAGE = i18n.translate('xpack.elasticAssistant.attackDiscovery.statusFail', {
  defaultMessage: 'The connector encountered an error while generating attack discoveries.',
});
