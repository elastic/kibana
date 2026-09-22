/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Wraps a label in backticks when it isn't a valid bare ES|QL identifier. */
export const escapeField = (field: string): string =>
  /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(field) ? field : `\`${field}\``;
