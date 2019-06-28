/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getTermsFields(fields) {
  return fields.filter(field => {
    return field.aggregatable && ['number', 'boolean', 'date', 'ip', 'string'].includes(field.type);
  });
}
