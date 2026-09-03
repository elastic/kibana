/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esFieldTypeToKibanaFieldType, KBN_FIELD_TYPES } from '@kbn/field-types';

export type ColumnKind = 'temporal' | 'numeric' | 'categorical' | 'other';

export const kindFromEsqlType = (esqlType: string): ColumnKind => {
  const kbnType = esFieldTypeToKibanaFieldType(esqlType);
  switch (kbnType) {
    case KBN_FIELD_TYPES.DATE:
    case KBN_FIELD_TYPES.DATE_RANGE:
      return 'temporal';
    case KBN_FIELD_TYPES.NUMBER:
    case KBN_FIELD_TYPES.NUMBER_RANGE:
    case KBN_FIELD_TYPES.HISTOGRAM:
    case KBN_FIELD_TYPES.EXPONENTIAL_HISTOGRAM:
    case KBN_FIELD_TYPES.TDIGEST:
      return 'numeric';
    case KBN_FIELD_TYPES.STRING:
    case KBN_FIELD_TYPES.BOOLEAN:
    case KBN_FIELD_TYPES.IP:
    case KBN_FIELD_TYPES.IP_RANGE:
      return 'categorical';
    case KBN_FIELD_TYPES._SOURCE:
    case KBN_FIELD_TYPES.ATTACHMENT:
    case KBN_FIELD_TYPES.GEO_POINT:
    case KBN_FIELD_TYPES.GEO_SHAPE:
    case KBN_FIELD_TYPES.MURMUR3:
    case KBN_FIELD_TYPES.UNKNOWN:
    case KBN_FIELD_TYPES.CONFLICT:
    case KBN_FIELD_TYPES.OBJECT:
    case KBN_FIELD_TYPES.NESTED:
    case KBN_FIELD_TYPES.FLATTENED:
    case KBN_FIELD_TYPES.MISSING:
    case KBN_FIELD_TYPES.NULL:
      return 'other';
    default: {
      const exhaustive: never = kbnType;
      return exhaustive;
    }
  }
};
