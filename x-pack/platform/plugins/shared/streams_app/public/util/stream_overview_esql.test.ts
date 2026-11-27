/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildDataQualityTotalDocCountEsql,
  buildDataQualityDegradedDocCountEsql,
  buildDataQualityIgnoredFieldsCountEsql,
  buildTopFailureReasonsEsql,
  buildStreamIngestHistogramEsql,
  getMeaningfulBucketMs,
} from './stream_overview_esql';

const SPECIAL_STREAM =
  'logs-cloud_asset_inventory.asset_inventory-orchestrator_gcp_kubernetes_engine_(gke)_cluster-default';

describe('stream_overview_esql', () => {
  describe('stream names with special characters', () => {
    it('quotes the stream name in the total doc count query', () => {
      expect(buildDataQualityTotalDocCountEsql(SPECIAL_STREAM)).toContain(`"${SPECIAL_STREAM}"`);
    });

    it('quotes the stream name in the ingest histogram query', () => {
      expect(buildStreamIngestHistogramEsql(SPECIAL_STREAM, 300000)).toContain(
        `FROM "${SPECIAL_STREAM}"`
      );
    });

    it('quotes the stream name in the degraded and ignored fields queries', () => {
      // The degraded query uses the default pretty printer, which wraps long
      // source names across lines, so the parts are checked separately.
      const degradedQuery = buildDataQualityDegradedDocCountEsql(SPECIAL_STREAM);
      expect(degradedQuery).toContain(`"${SPECIAL_STREAM}"`);
      expect(degradedQuery).toContain('METADATA _ignored');
      expect(buildDataQualityIgnoredFieldsCountEsql(SPECIAL_STREAM)).toContain(
        `"${SPECIAL_STREAM}" METADATA _ignored`
      );
    });

    it('quotes the failure store selector in the top failure reasons query', () => {
      expect(buildTopFailureReasonsEsql(SPECIAL_STREAM)).toContain(
        `FROM "${SPECIAL_STREAM}::failures"`
      );
    });

    it('quotes every index of a comma-separated source list', () => {
      const source = `${SPECIAL_STREAM},${SPECIAL_STREAM}::failures`;
      expect(buildStreamIngestHistogramEsql(source, 300000)).toContain(
        `FROM "${SPECIAL_STREAM}", "${SPECIAL_STREAM}::failures"`
      );
    });
  });

  describe('plain index patterns', () => {
    it('keeps wildcard patterns working', () => {
      expect(buildDataQualityTotalDocCountEsql('logs-*')).toBe(
        'FROM "logs-*" | STATS doc_count = COUNT(*)'
      );
    });
  });

  describe('getMeaningfulBucketMs', () => {
    it('snaps to meaningful intervals', () => {
      expect(getMeaningfulBucketMs(30 * 60 * 1000, 25)).toBe(60 * 1000);
      expect(getMeaningfulBucketMs(2 * 24 * 60 * 60 * 1000, 25)).toBe(60 * 60 * 1000);
    });
  });
});
