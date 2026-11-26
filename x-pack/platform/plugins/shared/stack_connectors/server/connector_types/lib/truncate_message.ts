/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface TruncateMessageResult {
  originalLength: number;
  truncated: boolean;
  value: string;
}

export const truncateMessage = (message: string, maxLength: number): TruncateMessageResult => {
  const originalLength = Array.from(message).length;

  if (originalLength <= maxLength) {
    return { originalLength, truncated: false, value: message };
  }

  return {
    originalLength,
    truncated: true,
    value: Array.from(message).slice(0, maxLength).join(''),
  };
};
