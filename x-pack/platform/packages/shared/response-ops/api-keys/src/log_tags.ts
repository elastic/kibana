/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface UiamLogTags {
  grant: string[];
  invalidate: string[];
  credentials: string[];
}

export const getUiamLogTags = (pluginTag: string): UiamLogTags => {
  const common = ['serverless', pluginTag, 'uiam'];
  return {
    grant: [...common, 'uiam-api-key-grant'],
    invalidate: [...common, 'uiam-api-key-invalidate'],
    credentials: [...common, 'uiam-api-key-invalid-credentials'],
  };
};
