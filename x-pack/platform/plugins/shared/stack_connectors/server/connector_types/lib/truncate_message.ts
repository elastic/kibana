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
  const characters = Array.from(message.trim());
  const originalLength = characters.length;

  if (originalLength <= maxLength) {
    return { originalLength, truncated: false, value: characters.join('') };
  }

  return {
    originalLength,
    truncated: true,
    value: characters.slice(0, maxLength).join(''),
  };
};
