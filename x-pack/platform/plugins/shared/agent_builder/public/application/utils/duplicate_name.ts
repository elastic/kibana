/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates a duplicate name by incrementing the numeric suffix.
 *
 * If the input name ends with an underscore followed by a number (e.g., "document_5"),
 * the function increments that number. If the name has no numeric suffix,
 * it appends "_1" to create the first duplicate.
 *
 * @param name - The original name to duplicate
 * @returns A new name with an incremented numeric suffix
 *
 * @example
 * ```typescript
 * duplicateName("my_tool");      // Returns "my_tool_1"
 * duplicateName("my_agent_1");    // Returns "my_agent_2"
 * ```
 */
export const duplicateName = (name: string) => {
  const match = name.match(/^(.+?)(?:_(\d+))?$/);
  if (!match) {
    return `${name}_1`;
  }
  const [, baseName, number] = match;
  return `${baseName}_${Number(number || 0) + 1}`;
};
