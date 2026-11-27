/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getResourceName(resource: string) {
  return `.kibana-observability-ai-assistant-${resource}`;
}

export const resourceNames = {
  componentTemplate: {
    conversations: getResourceName('component-template-conversations'),
    kb: getResourceName('component-template-kb'),
  },
  writeIndexAlias: {
    conversations: getResourceName('conversations'),
    kb: getResourceName('kb'),
  },
  indexPatterns: {
    conversations: getResourceName('conversations*'),
    kb: getResourceName('kb*'),
  },
  indexTemplate: {
    conversations: getResourceName('index-template-conversations'),
    kb: getResourceName('index-template-kb'),
  },
  concreteWriteIndexName: {
    conversations: getResourceName('conversations-000001'),
    kb: getResourceName('kb-000001'),
  },
};
