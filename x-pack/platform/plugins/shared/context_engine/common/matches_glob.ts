/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const matchesGlob = (pattern: string, value: string): boolean => {
  const parts = pattern.split('*');
  if (parts.length === 1) {
    return pattern === value;
  }
  const first = parts[0];
  const last = parts[parts.length - 1];
  const end = value.length - last.length;
  if (end < first.length || !value.startsWith(first) || !value.endsWith(last)) {
    return false;
  }
  let position = first.length;
  for (const part of parts.slice(1, -1)) {
    const index = value.indexOf(part, position);
    if (index === -1 || index + part.length > end) {
      return false;
    }
    position = index + part.length;
  }
  return true;
};
