/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { FieldIconProps } from '@kbn/react-field';

/**
 * Returns the Kibana field icon type based on the provided field type.
 *
 * @param fieldType - The type of the field for which the icon type is needed.
 * @returns The icon type corresponding to the provided field type.
 */
export function getKbnFieldIconType(type: string): FieldIconProps['type'] {
  switch (type) {
    case ES_FIELD_TYPES.FLOAT:
    case ES_FIELD_TYPES.HALF_FLOAT:
    case ES_FIELD_TYPES.SCALED_FLOAT:
    case ES_FIELD_TYPES.DOUBLE:
    case ES_FIELD_TYPES.INTEGER:
    case ES_FIELD_TYPES.LONG:
    case ES_FIELD_TYPES.SHORT:
    case ES_FIELD_TYPES.UNSIGNED_LONG:
      return 'number';

    case ES_FIELD_TYPES.DATE:
    case ES_FIELD_TYPES.DATE_NANOS:
      return 'date';

    default:
      return type as FieldIconProps['type'];
  }
}
