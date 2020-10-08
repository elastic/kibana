/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
