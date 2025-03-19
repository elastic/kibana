/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { myTest, describe } from './my_test';

describe('@myTest', () => {
  myTest('add items to todos', ({ todos, expect }) => {
    expect(todos.length).toBe(3);

    todos.push(3);
    expect(todos.length).toMatchInlineSnapshot(`4`);
  });

  myTest.concurrent('move items from todos to archive', async ({ todos, archive, expect }) => {
    expect(todos.length).toBe(3);
    expect(archive.length).toBe(0);

    archive.push(todos.pop());
    expect(todos.length).toBe(2);

    // showcase simple polling expectation
    await expect
      .poll(() => archive.length, {
        timeout: 8_000,
        interval: 1_000,
        message: 'some polling message',
      })
      .toBe(1);
  });
});
