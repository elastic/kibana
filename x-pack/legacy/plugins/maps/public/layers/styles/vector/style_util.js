/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export function getComputedFieldName(styleName, fieldName) {
  return `${getComputedFieldNamePrefix(fieldName)}__${styleName}`;
}

export function getComputedFieldNamePrefix(fieldName) {
  return `__kbn__dynamic__${fieldName}`;
}
