/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message } from './types';

export const getMessageContentAndRole = (prompt: string): Pick<Message, 'content' | 'role'> => ({
  content: prompt,
  role: 'user',
});
