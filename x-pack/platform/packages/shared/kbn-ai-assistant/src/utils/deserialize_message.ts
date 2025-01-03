/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { Message } from '@kbn/observability-ai-assistant-plugin/common';
import { safeJsonParse } from './safe_json_parse';

export const deserializeMessage = (message: Message): Message => {
  const copiedMessage = cloneDeep(message);

  if (
    copiedMessage.message.function_call?.arguments &&
    typeof copiedMessage.message.function_call?.arguments === 'string'
  ) {
    copiedMessage.message.function_call.arguments = safeJsonParse(
      copiedMessage.message.function_call.arguments ?? '{}'
    );
  }

  if (copiedMessage.message.name) {
    if (copiedMessage.message.content && typeof copiedMessage.message.content === 'string') {
      copiedMessage.message.content = safeJsonParse(copiedMessage.message.content);
    }

    if (copiedMessage.message.data && typeof copiedMessage.message.data === 'string') {
      copiedMessage.message.data = safeJsonParse(copiedMessage.message.data);
    }
  }

  return copiedMessage;
};
