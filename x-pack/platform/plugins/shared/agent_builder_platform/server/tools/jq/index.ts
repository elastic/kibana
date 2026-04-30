/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import jqImpl from './jq_impl';

export type JQFilter = (input: unknown) => IterableIterator<unknown>;

const jq = jqImpl as {
  (program: string, input?: unknown): IterableIterator<unknown> | JQFilter;
  compile: (program: string) => JQFilter;
};

export function runJq(expression: string, input: unknown): unknown[] {
  const filter = jq.compile(expression);
  return [...filter(input)];
}
