/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNextWriteIndexName } from './reindex_knowledge_base';

describe('getNextWriteIndexName', () => {
  it('should return the next write index name', async () => {
    expect(getNextWriteIndexName('.kibana-observability-ai-assistant-kb-000008')).toBe(
      '.kibana-observability-ai-assistant-kb-000009'
    );
  });

  it('should return empty when input is empty', async () => {
    expect(getNextWriteIndexName(undefined)).toBe(undefined);
  });

  it('should return empty when the sequence number is missing', async () => {
    expect(getNextWriteIndexName('.kibana-observability-ai-assistant-kb')).toBe(undefined);
  });

  it('should return empty when the sequence number is not a number', async () => {
    expect(getNextWriteIndexName('.kibana-observability-ai-assistant-kb-foobar')).toBe(undefined);
  });
});
