/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
const isoValidationMessage = `value must be a valid ISO format`;

export const isoStringValidate = (input: string): string | undefined => {
  if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}/.test(input)) {
    return isoValidationMessage;
  }
};
