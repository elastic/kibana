/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '../types';
import { MessageRole } from '../types';

export function isConfirmationMessage(msg: Message): boolean {
  if (msg.message.role === MessageRole.User && msg.message.name) {
    try {
      const content = JSON.parse(msg.message.content || '{}');
      return content.confirmed !== undefined;
    } catch {
      // Not valid JSON, not a confirmation message
      return false;
    }
  }
  return false;
}
