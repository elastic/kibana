/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'vitest';
export { describe } from 'vitest';

const todos: any[] = [];
const archive: any[] = [];

export const myTest = test.extend<{ todos: any[]; archive: any[] }>({
  todos: async ({}, use) => {
    // setup the fixture before each test function
    todos.push(1, 2, 3);

    // use the fixture value
    await use(todos);

    // cleanup the fixture after each test function
    todos.length = 0;
  },
  archive,
});
