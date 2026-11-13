/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAiIndexDetailPath,
  getAiIndexSourcesPath,
  getAiIndexKnowledgeDocumentsPath,
  getKnowledgeDocumentPath,
} from './paths';

describe('getAiIndexDetailPath', () => {
  it('builds the path without encoding the id', () => {
    expect(getAiIndexDetailPath('my-ai-index')).toBe('/ai_index/my-ai-index');
  });
});

describe('getAiIndexSourcesPath', () => {
  it('builds the sources tab path', () => {
    expect(getAiIndexSourcesPath('my-ai-index')).toBe('/ai_index/my-ai-index/sources');
  });
});

describe('getAiIndexKnowledgeDocumentsPath', () => {
  it('builds the knowledge documents tab path', () => {
    expect(getAiIndexKnowledgeDocumentsPath('my-ai-index')).toBe(
      '/ai_index/my-ai-index/knowledge_documents'
    );
  });
});

describe('getKnowledgeDocumentPath', () => {
  it('puts the backing index in the path', () => {
    expect(getKnowledgeDocumentPath('my-ai-index', 'ai-index-idx-sample')).toBe(
      '/ai_index/my-ai-index/knowledge_documents/ai-index-idx-sample'
    );
  });
});
