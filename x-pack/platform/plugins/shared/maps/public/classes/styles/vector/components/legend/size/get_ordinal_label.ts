/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getMaxLabel(
  isFieldMetaEnabled: boolean,
  isMaxOutsideStdRange: boolean,
  max: number | string
) {
  return isFieldMetaEnabled && isMaxOutsideStdRange ? `> ${max}` : max;
}

export function getMinLabel(
  isFieldMetaEnabled: boolean,
  isMinOutsideStdRange: boolean,
  min: number | string
) {
  return isFieldMetaEnabled && isMinOutsideStdRange ? `< ${min}` : min;
}
