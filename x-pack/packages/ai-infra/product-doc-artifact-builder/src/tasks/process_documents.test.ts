/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { processDocuments } from './process_documents';
import type { ExtractedDocument } from './extract_documentation';

const createLog = (): ToolingLog =>
  ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warning: jest.fn(),
  } as unknown as ToolingLog);

// ~150 distinct tokens — comfortably above the 120-token filter threshold
const ADEQUATE_BODY = Array.from({ length: 150 }, (_, i) => `word${i}`).join(' ');

const createDoc = (overrides: Partial<ExtractedDocument> = {}): ExtractedDocument => ({
  content_title: 'Sample Document',
  content_body: ADEQUATE_BODY,
  product_name: 'kibana',
  root_type: 'documentation',
  slug: 'sample-document',
  url: 'https://example.com/sample',
  version: '9.6',
  ai_subtitle: 'A subtitle',
  ai_summary: 'A summary',
  ai_questions_answered: [],
  ai_tags: [],
  ...overrides,
});

describe('processDocuments', () => {
  describe('document count', () => {
    it('passes all documents through when they are unique and have sufficient content', async () => {
      const docs = Array.from({ length: 10 }, (_, i) =>
        createDoc({ slug: `doc-${i}`, content_title: `Doc ${i}` })
      );

      const result = await processDocuments({ documents: docs, log: createLog() });

      expect(result).toHaveLength(10);
    });

    it('deduplicates documents with the same slug, keeping the first occurrence', async () => {
      const docs = [
        createDoc({ slug: 'shared-slug', content_title: 'First' }),
        createDoc({ slug: 'shared-slug', content_title: 'Second' }),
        createDoc({ slug: 'unique-slug', content_title: 'Third' }),
      ];

      const result = await processDocuments({ documents: docs, log: createLog() });

      expect(result).toHaveLength(2);
      expect(result.find((d) => d.slug === 'shared-slug')!.content_title).toBe('First');
    });

    it('filters documents with fewer than 120 tokens of content', async () => {
      const docs = [
        createDoc({ slug: 'rich', content_body: ADEQUATE_BODY }),
        createDoc({ slug: 'sparse', content_body: 'too short' }),
      ];

      const result = await processDocuments({ documents: docs, log: createLog() });

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('rich');
    });

    it('preserves all documents when none are duplicates or sparse', async () => {
      const count = 50;
      const docs = Array.from({ length: count }, (_, i) =>
        createDoc({ slug: `doc-${i}` })
      );

      const result = await processDocuments({ documents: docs, log: createLog() });

      expect(result).toHaveLength(count);
    });
  });

  describe('content_title trimming', () => {
    it('strips a site-name suffix separated by " | " (spaced pipe)', async () => {
      const docs = [createDoc({ slug: 'test', content_title: 'Getting Started | Elastic Docs' })];

      const result = await processDocuments({ documents: docs, log: createLog() });

      expect(result[0].content_title).toBe('Getting Started');
    });

    it('preserves a pipe that is part of a product name, e.g. ES|QL', async () => {
      const docs = [
        createDoc({ slug: 'esql', content_title: 'ES|QL for security use cases' }),
      ];

      const result = await processDocuments({ documents: docs, log: createLog() });

      expect(result[0].content_title).toBe('ES|QL for security use cases');
    });

    it('strips site suffix while preserving unspaced pipe in product name', async () => {
      const docs = [
        createDoc({ slug: 'esql-rules', content_title: 'ES|QL rules | Elastic Security' }),
      ];

      const result = await processDocuments({ documents: docs, log: createLog() });

      expect(result[0].content_title).toBe('ES|QL rules');
    });

    it('leaves titles with no pipe unchanged', async () => {
      const docs = [createDoc({ slug: 'plain', content_title: 'Data streams overview' })];

      const result = await processDocuments({ documents: docs, log: createLog() });

      expect(result[0].content_title).toBe('Data streams overview');
    });

    it('trims whitespace from the resulting title', async () => {
      const docs = [createDoc({ slug: 'padded', content_title: '  Spaces around  | Site' })];

      const result = await processDocuments({ documents: docs, log: createLog() });

      expect(result[0].content_title).toBe('Spaces around');
    });
  });
});
