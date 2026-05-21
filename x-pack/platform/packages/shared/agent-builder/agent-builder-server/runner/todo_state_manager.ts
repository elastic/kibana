/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TodoItem } from '@kbn/agent-builder-common/chat/conversation';

export interface TodoStateManager {
  set(todos: TodoItem[]): void;
  get(): TodoItem[] | undefined;
}

export const createTodoStateManager = (initial?: TodoItem[]): TodoStateManager => {
  let state: TodoItem[] | undefined = initial?.length ? initial : undefined;
  return {
    set: (todos) => {
      state = todos;
    },
    get: () => state,
  };
};
