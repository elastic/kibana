/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dedent from 'dedent';

/**
 * Clean up a template string prompt by removing extra newlines and whitespace.
 */
export const cleanPrompt = (prompt: string) => {
  return dedent(prompt).replace(/(\r?\n\s*){2,}/g, '\n\n');
};
