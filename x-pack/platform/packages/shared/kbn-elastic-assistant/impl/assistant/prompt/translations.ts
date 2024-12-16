/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SYSTEM_PROMPT_CONTEXT_NON_I18N = (context: string) => {
  return `CONTEXT:\n"""\n${context}\n"""`;
};
