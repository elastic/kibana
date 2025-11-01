/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enrichmentUrlSchema } from './enrichment_url_schema';
import type { EnrichmentUrlStateV3, EnrichmentUrlStateV2, EnrichmentUrlStateV1 } from './enrichment_url_schema';

describe('Enrichment URL Schema', () => {
  describe('URL Schema v3 - stepsToAppend', () => {
    it('should validate v3 state with steps and WHERE conditions', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [
          {
            type: 'random-samples',
            enabled: true,
          },
        ],
        stepsToAppend: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:client_ip}'],
            where: {
              field: 'host.name',
              eq: 'host-1',
            },
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(state);
      }
    });

    it('should validate steps with complex conditions', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [
          {
            type: 'random-samples',
            enabled: true,
          },
        ],
        stepsToAppend: [
          {
            action: 'grok',
            from: 'body.text',
            patterns: ['%{IP:client_ip}'],
            where: {
              and: [
                { field: 'host.name', eq: 'host-1' },
                { field: 'status', eq: 'active' },
              ],
            },
          },
          {
            action: 'set',
            to: 'service.name',
            value: 'ftpd',
            where: {
              or: [
                { field: 'type', eq: 'premium' },
                { field: 'category', eq: 'gold' },
              ],
            },
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should validate steps without WHERE conditions', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [
          {
            type: 'random-samples',
            enabled: true,
          },
        ],
        stepsToAppend: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:client_ip}'],
          },
          {
            action: 'set',
            to: 'processed',
            value: true,
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should validate WHERE blocks (nested steps)', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [
          {
            type: 'random-samples',
            enabled: true,
          },
        ],
        stepsToAppend: [
          {
            where: {
              field: 'host.name',
              eq: 'host-1',
              steps: [
                {
                  action: 'set',
                  to: 'processed',
                  value: true,
                },
              ],
            },
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should validate empty steps array', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [
          {
            type: 'random-samples',
            enabled: true,
          },
        ],
        stepsToAppend: [],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should validate state without stepsToAppend', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [
          {
            type: 'random-samples',
            enabled: true,
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });
  });

  describe('URL Schema v2 backward compatibility - processorsToAppend', () => {
    it('should validate v2 processors', () => {
      const state: EnrichmentUrlStateV2 = {
        v: 2,
        dataSources: [
          {
            type: 'random-samples',
            enabled: true,
          },
        ],
        processorsToAppend: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:client_ip}'],
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should validate v2 state without processorsToAppend', () => {
      const state: EnrichmentUrlStateV2 = {
        v: 2,
        dataSources: [
          {
            type: 'random-samples',
            enabled: true,
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });
  });

  describe('URL Schema v1 compatibility', () => {
    it('should validate v1 state', () => {
      const state: EnrichmentUrlStateV1 = {
        v: 1,
        dataSources: [
          {
            type: 'random-samples',
            enabled: true,
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });
  });

  describe('Data sources validation', () => {
    it('should validate random-samples data source', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [
          {
            type: 'random-samples',
            enabled: true,
            name: 'Random Samples',
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should validate kql-samples data source', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [
          {
            type: 'kql-samples',
            enabled: true,
            name: 'KQL Query',
            query: {
              language: 'kuery',
              query: 'host.name: "host-1"',
            },
            filters: [],
            timeRange: {
              from: 'now-15m',
              to: 'now',
            },
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should validate custom-samples data source', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [
          {
            type: 'custom-samples',
            enabled: true,
            name: 'Custom Docs',
            documents: [
              {
                body: {
                  message: 'test message',
                },
                attributes: {},
                resource: {},
              },
            ],
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should validate multiple data sources', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [
          {
            type: 'random-samples',
            enabled: true,
          },
          {
            type: 'kql-samples',
            enabled: false,
            query: {
              language: 'kuery',
              query: '*',
            },
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });
  });

  describe('Condition types validation', () => {
    it('should validate all filter condition types', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [
          {
            type: 'random-samples',
            enabled: true,
          },
        ],
        stepsToAppend: [
          {
            action: 'set',
            to: 'test1',
            value: 'eq',
            where: { field: 'f1', eq: 'v1' },
          },
          {
            action: 'set',
            to: 'test2',
            value: 'neq',
            where: { field: 'f2', neq: 'v2' },
          },
          {
            action: 'set',
            to: 'test3',
            value: 'gt',
            where: { field: 'f3', gt: 10 },
          },
          {
            action: 'set',
            to: 'test4',
            value: 'gte',
            where: { field: 'f4', gte: 20 },
          },
          {
            action: 'set',
            to: 'test5',
            value: 'lt',
            where: { field: 'f5', lt: 30 },
          },
          {
            action: 'set',
            to: 'test6',
            value: 'lte',
            where: { field: 'f6', lte: 40 },
          },
          {
            action: 'set',
            to: 'test7',
            value: 'contains',
            where: { field: 'f7', contains: 'text' },
          },
          {
            action: 'set',
            to: 'test8',
            value: 'startsWith',
            where: { field: 'f8', startsWith: 'start' },
          },
          {
            action: 'set',
            to: 'test9',
            value: 'endsWith',
            where: { field: 'f9', endsWith: 'end' },
          },
          {
            action: 'set',
            to: 'test10',
            value: 'exists',
            where: { field: 'f10', exists: true },
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should validate nested AND/OR conditions', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [
          {
            type: 'random-samples',
            enabled: true,
          },
        ],
        stepsToAppend: [
          {
            action: 'set',
            to: 'test',
            value: 'value',
            where: {
              and: [
                { field: 'f1', eq: 'v1' },
                {
                  or: [
                    { field: 'f2', eq: 'v2' },
                    { field: 'f3', eq: 'v3' },
                  ],
                },
              ],
            },
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should validate NOT conditions', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [
          {
            type: 'random-samples',
            enabled: true,
          },
        ],
        stepsToAppend: [
          {
            action: 'set',
            to: 'test',
            value: 'value',
            where: {
              not: {
                field: 'status',
                eq: 'inactive',
              },
            },
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });
  });

  describe('All processor types validation', () => {
    it('should validate grok processor', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [{ type: 'random-samples', enabled: true }],
        stepsToAppend: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:ip}'],
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should validate dissect processor', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [{ type: 'random-samples', enabled: true }],
        stepsToAppend: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '%{a} %{b}',
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should validate set processor', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [{ type: 'random-samples', enabled: true }],
        stepsToAppend: [
          {
            action: 'set',
            to: 'field',
            value: 'value',
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should validate date processor', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [{ type: 'random-samples', enabled: true }],
        stepsToAppend: [
          {
            action: 'date',
            from: 'timestamp_string',
            to: 'timestamp',
            formats: ['yyyy-MM-dd'],
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should validate rename processor', () => {
      const state: EnrichmentUrlStateV3 = {
        v: 3,
        dataSources: [{ type: 'random-samples', enabled: true }],
        stepsToAppend: [
          {
            action: 'rename',
            from: 'old_field',
            to: 'new_field',
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid states', () => {
    it('should reject invalid version', () => {
      const state = {
        v: 99,
        dataSources: [],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(false);
    });

    it('should reject missing dataSources', () => {
      const state = {
        v: 3,
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(false);
    });

    it('should reject invalid processor action', () => {
      const state = {
        v: 3,
        dataSources: [{ type: 'random-samples', enabled: true }],
        stepsToAppend: [
          {
            action: 'invalid_action',
            from: 'field',
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(false);
    });

    it('should reject invalid data source type', () => {
      const state = {
        v: 3,
        dataSources: [
          {
            type: 'invalid-type',
            enabled: true,
          },
        ],
      };

      const result = enrichmentUrlSchema.safeParse(state);
      expect(result.success).toBe(false);
    });
  });
});

