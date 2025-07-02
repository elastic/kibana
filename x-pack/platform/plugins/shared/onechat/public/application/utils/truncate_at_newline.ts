/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Truncates a string at the first newline character.
 * If no newline character is present, the original string is returned.
 *
 * @param str The string to truncate.
 * @returns The truncated string, or an empty string if the input is null or undefined.
 */
export const truncateAtNewline = (str: string): string => {
  if (!str) {
    return '';
  }
  const [truncated] = str.split('\n');
  return truncated;
};
