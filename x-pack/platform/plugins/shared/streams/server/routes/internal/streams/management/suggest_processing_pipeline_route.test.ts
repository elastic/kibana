/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suggestIngestPipelineSchema } from './suggest_processing_pipeline_route';

describe('suggestIngestPipelineSchema', () => {
  const validDocuments = [
    { 'body.text': 'test log message', '@timestamp': '2024-01-01T00:00:00.000Z' },
  ];

  const validExtractedPatterns = {
    grok: null,
    dissect: null,
  };

  it('validates correct request parameters', () => {
    const validParams = {
      path: { name: 'logs.test' },
      body: {
        connector_id: 'test-connector',
        documents: validDocuments,
        extracted_patterns: validExtractedPatterns,
      },
    };

    const result = suggestIngestPipelineSchema.safeParse(validParams);
    expect(result.success).toBe(true);
  });

  it('validates request with grok patterns', () => {
    const params = {
      path: { name: 'logs.test' },
      body: {
        connector_id: 'test-connector',
        documents: validDocuments,
        extracted_patterns: {
          grok: {
            fieldName: 'body.text',
            patternGroups: [
              {
                messages: ['GET /api/users HTTP/1.1'],
                nodes: [{ pattern: '%{WORD:method} %{URIPATH:path}' }],
              },
            ],
          },
          dissect: null,
        },
      },
    };

    const result = suggestIngestPipelineSchema.safeParse(params);
    expect(result.success).toBe(true);
  });

  it('validates request with dissect patterns', () => {
    const params = {
      path: { name: 'logs.test' },
      body: {
        connector_id: 'test-connector',
        documents: validDocuments,
        extracted_patterns: {
          grok: null,
          dissect: {
            fieldName: 'body.text',
            messages: ['user=john action=login'],
          },
        },
      },
    };

    const result = suggestIngestPipelineSchema.safeParse(params);
    expect(result.success).toBe(true);
  });

  it('validates request with grok node having component values', () => {
    const params = {
      path: { name: 'logs.test' },
      body: {
        connector_id: 'test-connector',
        documents: validDocuments,
        extracted_patterns: {
          grok: {
            fieldName: 'body.text',
            patternGroups: [
              {
                messages: ['GET /api/users HTTP/1.1'],
                nodes: [
                  {
                    id: 'method',
                    component: 'WORD',
                    values: ['GET', 'POST', 'PUT'],
                  },
                ],
              },
            ],
          },
          dissect: null,
        },
      },
    };

    const result = suggestIngestPipelineSchema.safeParse(params);
    expect(result.success).toBe(true);
  });

  it('rejects missing stream name', () => {
    const invalidParams = {
      path: {},
      body: {
        connector_id: 'test-connector',
        documents: validDocuments,
        extracted_patterns: validExtractedPatterns,
      },
    };

    const result = suggestIngestPipelineSchema.safeParse(invalidParams);
    expect(result.success).toBe(false);
  });

  it('rejects missing connector_id', () => {
    const invalidParams = {
      path: { name: 'logs.test' },
      body: {
        documents: validDocuments,
        extracted_patterns: validExtractedPatterns,
      },
    };

    const result = suggestIngestPipelineSchema.safeParse(invalidParams);
    expect(result.success).toBe(false);
  });

  it('rejects missing documents', () => {
    const invalidParams = {
      path: { name: 'logs.test' },
      body: {
        connector_id: 'test-connector',
        extracted_patterns: validExtractedPatterns,
      },
    };

    const result = suggestIngestPipelineSchema.safeParse(invalidParams);
    expect(result.success).toBe(false);
  });

  it('rejects missing extracted_patterns', () => {
    const invalidParams = {
      path: { name: 'logs.test' },
      body: {
        connector_id: 'test-connector',
        documents: validDocuments,
      },
    };

    const result = suggestIngestPipelineSchema.safeParse(invalidParams);
    expect(result.success).toBe(false);
  });

  it('accepts empty documents array', () => {
    const params = {
      path: { name: 'logs.test' },
      body: {
        connector_id: 'test-connector',
        documents: [],
        extracted_patterns: validExtractedPatterns,
      },
    };

    const result = suggestIngestPipelineSchema.safeParse(params);
    expect(result.success).toBe(true);
  });

  it('validates documents with various field types', () => {
    const params = {
      path: { name: 'logs.test' },
      body: {
        connector_id: 'test-connector',
        documents: [
          {
            'body.text': 'test message',
            '@timestamp': '2024-01-01T00:00:00.000Z',
            'attributes.level': 'error',
            'attributes.count': 42,
            'attributes.enabled': true,
          },
        ],
        extracted_patterns: validExtractedPatterns,
      },
    };

    const result = suggestIngestPipelineSchema.safeParse(params);
    expect(result.success).toBe(true);
  });
});
