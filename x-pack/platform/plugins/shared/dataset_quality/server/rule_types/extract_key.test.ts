/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractKey } from './extract_key';

describe('extractKey', () => {
  it('returns empty if "_index" is not part of the groupBy', async () => {
    const result = extractKey({
      groupBy: ['host.name', 'source.ip'],
      bucketKey: ['.ds-logs-custom-default-2025.04.08-000001', '127.0.0.1'],
    });

    expect(result).toEqual(['.ds-logs-custom-default-2025.04.08-000001', '127.0.0.1']);
  });

  describe('when "_index" is part of the groupBy', () => {
    it('and is not a backing index name', async () => {
      const result = extractKey({
        groupBy: ['_index'],
        bucketKey: ['logs-custom-default'],
      });

      expect(result).toEqual(['logs-custom-default']);
    });

    it('and is the only element in groupBy', async () => {
      const result = extractKey({
        groupBy: ['_index'],
        bucketKey: ['.ds-logs-custom-default-2025.04.08-000001'],
      });

      expect(result).toEqual(['logs-custom-default']);
    });

    it('and is at the beginning of the groupBy', async () => {
      const result = extractKey({
        groupBy: ['_index', 'cloud.provider'],
        bucketKey: ['.ds-logs-custom-default-2025.04.08-000001', 'aws'],
      });

      expect(result).toEqual(['logs-custom-default', 'aws']);
    });

    it('and is at the end of the groupBy', async () => {
      const result = extractKey({
        groupBy: ['cloud.provider', '_index'],
        bucketKey: ['aws', '.ds-logs-custom-default-2025.04.08-000001'],
      });

      expect(result).toEqual(['aws', 'logs-custom-default']);
    });

    it('and is at the middle of the groupBy', async () => {
      const result = extractKey({
        groupBy: ['cloud.region', '_index', 'cloud.provider'],
        bucketKey: ['eu-central-1', '.ds-logs-custom-default-2025.04.08-000001', 'aws'],
      });

      expect(result).toEqual(['eu-central-1', 'logs-custom-default', 'aws']);
    });
  });
});
