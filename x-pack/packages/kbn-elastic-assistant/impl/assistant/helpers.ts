/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '../assistant_context/types';

export const getMessageFromRawResponse = (rawResponse: string): Message => {
  const dateTimeString = new Date().toLocaleString(); // TODO: Pull from response
  if (rawResponse) {
    return {
      role: 'assistant',
      content: rawResponse,
      timestamp: dateTimeString,
    };
  } else {
    return {
      role: 'assistant',
      content: 'Error: Response from LLM API is empty or undefined.',
      timestamp: dateTimeString,
    };
  }
};
