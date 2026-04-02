/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Intentional stdout diagnostics for dynamic capacity (grep for `***`). */
export function logTaskManagerCapacityToConsole(message: string): void {
  // eslint-disable-next-line no-console
  console.log(message);
}
