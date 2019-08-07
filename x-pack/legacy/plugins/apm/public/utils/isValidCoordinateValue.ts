/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const isValidCoordinateValue = (
  value: number | null | undefined
): value is number => value !== null && value !== undefined;
