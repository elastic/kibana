/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { preventParallelCalls } from './prevent_parallel_calls';

it('only calls fn when previous call is complete, ignores when filter returns true', async () => {
  const orderOfEvents = [];

  async function foo(arg) {
    orderOfEvents.push(`called with ${arg}`);
    await new Promise((resolve) => setTimeout(resolve, arg));
    orderOfEvents.push(`resolved with ${arg}`);
  }

  const serialized = preventParallelCalls(foo, (arg) => arg === 0);

  await Promise.all([
    serialized(100),
    serialized(0),
    serialized(150),
    serialized(170),
    serialized(50),
  ]);

  expect(orderOfEvents).toMatchInlineSnapshot(`
Array [
  "called with 100",
  "called with 0",
  "resolved with 0",
  "resolved with 100",
  "called with 150",
  "resolved with 150",
  "called with 170",
  "resolved with 170",
  "called with 50",
  "resolved with 50",
]
`);
});
