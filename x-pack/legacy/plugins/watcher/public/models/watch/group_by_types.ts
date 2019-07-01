/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
export interface GroupByType {
  text: string;
  sizeRequired: boolean;
  value: string;
  validNormalizedTypes: string[];
}
export const groupByTypes: { [key: string]: GroupByType } = {
  all: {
    text: i18n.translate('xpack.watcher.thresholdWatchExpression.groupByLabel.allDocumentsLabel', {
      defaultMessage: 'all documents',
    }),
    sizeRequired: false,
    value: 'all',
    validNormalizedTypes: [],
  },
  top: {
    text: i18n.translate('xpack.watcher.thresholdWatchExpression.groupByLabel.topLabel', {
      defaultMessage: 'top',
    }),
    sizeRequired: true,
    value: 'top',
    validNormalizedTypes: ['number', 'date', 'keyword'],
  },
};
