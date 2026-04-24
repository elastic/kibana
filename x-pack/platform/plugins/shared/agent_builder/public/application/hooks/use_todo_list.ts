/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import type { TodoItem } from '@kbn/agent-builder-common/chat/conversation';

export const useTodoList = (initialTodos?: TodoItem[]) => {
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos ?? []);
  return { todos, setTodos };
};
