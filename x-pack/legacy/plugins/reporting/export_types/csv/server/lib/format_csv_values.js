/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isObject, isNull, isUndefined } from 'lodash';

export function createFormatCsvValues(escapeValue, separator, fields, formatsMap) {
  return function formatCsvValues(values) {
    return fields
      .map(field => {
        let value;
        if (field === '_source') {
          value = values;
        } else {
          value = values[field];
        }
        if (isNull(value) || isUndefined(value)) {
          return '';
        }

        let formattedValue = value;
        if (formatsMap.has(field)) {
          const formatter = formatsMap.get(field);
          formattedValue = formatter.convert(value);
        }

        return formattedValue;
      })
      .map(value => (isObject(value) ? JSON.stringify(value) : value))
      .map(value => value.toString())
      .map(escapeValue)
      .join(separator);
  };
}
