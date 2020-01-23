/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const painlessContextOptions = [
  {
    value: 'painless_test',
    text: i18n.translate('xpack.painless_playground.selectDefaultLabel', {
      defaultMessage: 'Default - Execute as it is',
    }),
  },
  {
    value: 'filter',
    text: i18n.translate('xpack.painless_playground.selectFilterLabel', {
      defaultMessage: 'Filter - Execute like inside a script query of a filter',
    }),
  },
  {
    value: 'score',
    text: i18n.translate('xpack.painless_playground.selectScoreLabel', {
      defaultMessage:
        'Score - Execution like inside a script_score function in function_score query',
    }),
  },
];
