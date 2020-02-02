/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  GEO_JSON_TYPE,
  FEATURE_VISIBLE_PROPERTY_NAME,
  KBN_TOO_MANY_FEATURES_PROPERTY,
} from '../../../common/constants';

const VISIBILITY_FILTER_CLAUSE_PREFIX = [
  'all',
  ['==', ['get', FEATURE_VISIBLE_PROPERTY_NAME], true],
];

const TOO_MANY_FEATURES_FILTER = ['all', ['==', ['get', KBN_TOO_MANY_FEATURES_PROPERTY], false]];

const CLOSED_SHAPE_MB_FILTER = [
  ...TOO_MANY_FEATURES_FILTER,
  [
    'any',
    ['==', ['geometry-type'], GEO_JSON_TYPE.POLYGON],
    ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POLYGON],
  ],
];

const VISIBLE_JOINED_CLOSED_SHAPE_MB_FILTER = [
  ...VISIBILITY_FILTER_CLAUSE_PREFIX,
  CLOSED_SHAPE_MB_FILTER,
];

const ALL_SHAPE_MB_FILTER = [
  ...TOO_MANY_FEATURES_FILTER,
  [
    'any',
    ['==', ['geometry-type'], GEO_JSON_TYPE.POLYGON],
    ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POLYGON],
    ['==', ['geometry-type'], GEO_JSON_TYPE.LINE_STRING],
    ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_LINE_STRING],
  ],
];

const VISIBLE_JOINED_ALL_SHAPE_MB_FILTER = [
  ...VISIBILITY_FILTER_CLAUSE_PREFIX,
  ALL_SHAPE_MB_FILTER,
];

const POINT_MB_FILTER = [
  ...TOO_MANY_FEATURES_FILTER,
  [
    'any',
    ['==', ['geometry-type'], GEO_JSON_TYPE.POINT],
    ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POINT],
  ],
];

const VISIBLE_JOINED_POINT_MB_FILTER = [...VISIBILITY_FILTER_CLAUSE_PREFIX, POINT_MB_FILTER];

export function getFillFilterExpression(hasJoins) {
  return hasJoins ? VISIBLE_JOINED_CLOSED_SHAPE_MB_FILTER : CLOSED_SHAPE_MB_FILTER;
}

export function getLineFilterExpression(hasJoins) {
  return hasJoins ? VISIBLE_JOINED_ALL_SHAPE_MB_FILTER : ALL_SHAPE_MB_FILTER;
}

export function getPointFilterExpression(hasJoins) {
  return hasJoins ? VISIBLE_JOINED_POINT_MB_FILTER : POINT_MB_FILTER;
}
