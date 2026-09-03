/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const markdownHeight = (content: string): number => {
  if (content.length === 0) {
    return 3;
  }
  return Math.min(12, Math.max(3, content.split('\n').length));
};
