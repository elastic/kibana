/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FieldType } from 'ui/index_patterns';
import { ML_JOB_FIELD_TYPES } from '../../../common/constants/field_types';

import { KBN_FIELD_TYPES } from '../../../../../../../src/plugins/data/public';

// convert kibana types to ML Job types
// this is needed because kibana types only have string and not text and keyword.
// and we can't use ES_FIELD_TYPES because it has no NUMBER type
export function kbnTypeToMLJobType(field: FieldType) {
  // Return undefined if not one of the supported data visualizer field types.
  let type;
  switch (field.type) {
    case KBN_FIELD_TYPES.STRING:
      type = field.aggregatable ? ML_JOB_FIELD_TYPES.KEYWORD : ML_JOB_FIELD_TYPES.TEXT;
      break;
    case KBN_FIELD_TYPES.NUMBER:
      type = ML_JOB_FIELD_TYPES.NUMBER;
      break;
    case KBN_FIELD_TYPES.DATE:
      type = ML_JOB_FIELD_TYPES.DATE;
      break;
    case KBN_FIELD_TYPES.IP:
      type = ML_JOB_FIELD_TYPES.IP;
      break;
    case KBN_FIELD_TYPES.BOOLEAN:
      type = ML_JOB_FIELD_TYPES.BOOLEAN;
      break;
    case KBN_FIELD_TYPES.GEO_POINT:
      type = ML_JOB_FIELD_TYPES.GEO_POINT;
      break;
    default:
      break;
  }

  return type;
}

export const mlJobTypeAriaLabels = {
  BOOLEAN: i18n.translate('xpack.ml.fieldTypeIcon.booleanTypeAriaLabel', {
    defaultMessage: 'boolean type',
  }),
  DATE: i18n.translate('xpack.ml.fieldTypeIcon.dateTypeAriaLabel', {
    defaultMessage: 'date type',
  }),
  GEO_POINT: i18n.translate('xpack.ml.fieldTypeIcon.geoPointTypeAriaLabel', {
    defaultMessage: '{geoPointParam} type',
    values: {
      geoPointParam: 'geo point',
    },
  }),
  IP: i18n.translate('xpack.ml.fieldTypeIcon.ipTypeAriaLabel', {
    defaultMessage: 'ip type',
  }),
  KEYWORD: i18n.translate('xpack.ml.fieldTypeIcon.keywordTypeAriaLabel', {
    defaultMessage: 'keyword type',
  }),
  NUMBER: i18n.translate('xpack.ml.fieldTypeIcon.numberTypeAriaLabel', {
    defaultMessage: 'number type',
  }),
  TEXT: i18n.translate('xpack.ml.fieldTypeIcon.textTypeAriaLabel', {
    defaultMessage: 'text type',
  }),
  UNKNOWN: i18n.translate('xpack.ml.fieldTypeIcon.unknownTypeAriaLabel', {
    defaultMessage: 'unknown type',
  }),
};

export const getMLJobTypeAriaLabel = (type: string) => {
  const requestedFieldType = Object.keys(ML_JOB_FIELD_TYPES).find(
    k => ML_JOB_FIELD_TYPES[k as keyof typeof ML_JOB_FIELD_TYPES] === type
  );
  if (requestedFieldType === undefined) {
    return null;
  }
  return mlJobTypeAriaLabels[requestedFieldType as keyof typeof mlJobTypeAriaLabels];
};
