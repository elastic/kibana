/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildDataQualityTotalDocCountEsql,
  buildStreamIngestHistogramEsql,
} from './stream_overview_esql';

const UNMAPPED_FIELDS_DIRECTIVE = 'SET unmapped_fields="LOAD";';
const DRAFT_VIEW = '$.logs.ecs.linux.child';

describe('stream_overview_esql', () => {
  describe('buildDataQualityTotalDocCountEsql', () => {
    it('builds a total doc count query without the unmapped-fields directive by default', () => {
      const query = buildDataQualityTotalDocCountEsql('logs');

      expect(query).not.toContain(UNMAPPED_FIELDS_DIRECTIVE);
      expect(query).toContain('STATS doc_count = COUNT(*)');
    });

    it('prepends the unmapped-fields directive when loadUnmappedFields is true', () => {
      const query = buildDataQualityTotalDocCountEsql(DRAFT_VIEW, { loadUnmappedFields: true });

      expect(query.startsWith(UNMAPPED_FIELDS_DIRECTIVE)).toBe(true);
      expect(query).toContain('STATS doc_count = COUNT(*)');
    });
  });

  describe('buildStreamIngestHistogramEsql', () => {
    it('builds a histogram query without the unmapped-fields directive by default', () => {
      const query = buildStreamIngestHistogramEsql('logs', 60_000);

      expect(query).not.toContain(UNMAPPED_FIELDS_DIRECTIVE);
      expect(query).toContain('BUCKET(@timestamp');
    });

    it('prepends the unmapped-fields directive when loadUnmappedFields is true', () => {
      const query = buildStreamIngestHistogramEsql(DRAFT_VIEW, 60_000, {
        loadUnmappedFields: true,
      });

      expect(query.startsWith(UNMAPPED_FIELDS_DIRECTIVE)).toBe(true);
      expect(query).toContain('BUCKET(@timestamp');
    });
  });
});
