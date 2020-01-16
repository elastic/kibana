/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const painlessContextOptions = [
  {
    value: 'painless_test',
    text: i18n.translate('tileMap.tooltipFormatter.latitudeLabel', {
      defaultMessage: 'Default - Execute as it is',
    }),
  },
  {
    value: 'filter',
    text: i18n.translate('tileMap.tooltipFormatter.latitudeLabel', {
      defaultMessage: 'Filter - Execute like inside a script query',
    }),
  },
  {
    value: 'score',
    text: i18n.translate('tileMap.tooltipFormatter.latitudeLabel', {
      defaultMessage: 'Score - Execute like inside a script query',
    }),
  },
];
