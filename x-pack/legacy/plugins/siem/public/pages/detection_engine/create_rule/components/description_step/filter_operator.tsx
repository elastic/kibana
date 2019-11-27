/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { esFilters } from '../../../../../../../../../../src/plugins/data/public';

export interface Operator {
  message: string;
  type: esFilters.FILTERS;
  negate: boolean;
  fieldTypes?: string[];
}

export const isOperator = {
  message: i18n.translate('data.filter.filterEditor.isOperatorOptionLabel', {
    defaultMessage: 'is',
  }),
  type: esFilters.FILTERS.PHRASE,
  negate: false,
};

export const isNotOperator = {
  message: i18n.translate('data.filter.filterEditor.isNotOperatorOptionLabel', {
    defaultMessage: 'is not',
  }),
  type: esFilters.FILTERS.PHRASE,
  negate: true,
};

export const isOneOfOperator = {
  message: i18n.translate('data.filter.filterEditor.isOneOfOperatorOptionLabel', {
    defaultMessage: 'is one of',
  }),
  type: esFilters.FILTERS.PHRASES,
  negate: false,
  fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
};

export const isNotOneOfOperator = {
  message: i18n.translate('data.filter.filterEditor.isNotOneOfOperatorOptionLabel', {
    defaultMessage: 'is not one of',
  }),
  type: esFilters.FILTERS.PHRASES,
  negate: true,
  fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
};

export const isBetweenOperator = {
  message: i18n.translate('data.filter.filterEditor.isBetweenOperatorOptionLabel', {
    defaultMessage: 'is between',
  }),
  type: esFilters.FILTERS.RANGE,
  negate: false,
  fieldTypes: ['number', 'date', 'ip'],
};

export const isNotBetweenOperator = {
  message: i18n.translate('data.filter.filterEditor.isNotBetweenOperatorOptionLabel', {
    defaultMessage: 'is not between',
  }),
  type: esFilters.FILTERS.RANGE,
  negate: true,
  fieldTypes: ['number', 'date', 'ip'],
};

export const existsOperator = {
  message: i18n.translate('data.filter.filterEditor.existsOperatorOptionLabel', {
    defaultMessage: 'exists',
  }),
  type: esFilters.FILTERS.EXISTS,
  negate: false,
};

export const doesNotExistOperator = {
  message: i18n.translate('data.filter.filterEditor.doesNotExistOperatorOptionLabel', {
    defaultMessage: 'does not exist',
  }),
  type: esFilters.FILTERS.EXISTS,
  negate: true,
};

export const FILTER_OPERATORS: Operator[] = [
  isOperator,
  isNotOperator,
  isOneOfOperator,
  isNotOneOfOperator,
  isBetweenOperator,
  isNotBetweenOperator,
  existsOperator,
  doesNotExistOperator,
];
