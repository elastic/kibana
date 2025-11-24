/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  calculateTimestampAccuracy,
  calculateLogLevelAccuracy,
  calculateFieldQuality,
  calculateFieldCountPenalty,
  calculateOverallQuality,
  type ParsedLog,
  type PatternQualityMetrics,
} from './pattern_extraction_metrics';
import type { PatternExtractionGroundTruth } from './pattern_extraction_datasets';

describe('Pattern Extraction Metrics', () => {
  describe('calculateTimestampAccuracy', () => {
    const expectedFields: PatternExtractionGroundTruth['expected_fields'] = {
      timestamp: {
        field_name: '@timestamp',
        format: 'yyyy-MM-dd HH:mm:ss',
        example_value: '2023-01-15 10:30:45',
        grok_pattern: 'TIMESTAMP_ISO8601',
      },
      other_fields: [],
    };

    it('should return 1.0 for all correctly extracted timestamps', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: { '@timestamp': '2023-01-15 10:30:45' },
          originalMessage: '[2023-01-15 10:30:45] INFO Test',
        },
        {
          parsed: true,
          fields: { '@timestamp': '2023-01-16 14:22:33' },
          originalMessage: '[2023-01-16 14:22:33] ERROR Test',
        },
      ];

      const accuracy = calculateTimestampAccuracy(parsedLogs, expectedFields);
      expect(accuracy).toBe(1.0);
    });

    it('should return 0.0 for logs with no timestamp extracted', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: { message: 'Some log without timestamp' },
          originalMessage: 'Some log without timestamp',
        },
      ];

      const accuracy = calculateTimestampAccuracy(parsedLogs, expectedFields);
      expect(accuracy).toBe(0.0);
    });

    it('should return 0.0 for unparsed logs', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: false,
          fields: {},
          originalMessage: 'Unparsed log',
        },
      ];

      const accuracy = calculateTimestampAccuracy(parsedLogs, expectedFields);
      expect(accuracy).toBe(0.0);
    });

    it('should return 0.5 for timestamps with wrong format', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: { '@timestamp': '15/01/2023' }, // DD/MM/YYYY instead of YYYY-MM-DD
          originalMessage: '[15/01/2023] INFO Test',
        },
      ];

      const accuracy = calculateTimestampAccuracy(parsedLogs, expectedFields);
      expect(accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy).toBeLessThan(1.0);
    });

    it('should handle mixed accuracy scenarios', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: { '@timestamp': '2023-01-15 10:30:45' }, // Correct
          originalMessage: '[2023-01-15 10:30:45] INFO Test',
        },
        {
          parsed: true,
          fields: {}, // Missing timestamp
          originalMessage: 'Log without timestamp',
        },
        {
          parsed: false,
          fields: {},
          originalMessage: 'Unparsed log',
        },
      ];

      const accuracy = calculateTimestampAccuracy(parsedLogs, expectedFields);
      expect(accuracy).toBeGreaterThan(0);
      expect(accuracy).toBeLessThan(1.0);
      expect(accuracy).toBeCloseTo(0.33, 1);
    });
  });

  describe('calculateLogLevelAccuracy', () => {
    const expectedFields: PatternExtractionGroundTruth['expected_fields'] = {
      timestamp: {
        field_name: '@timestamp',
        format: 'yyyy-MM-dd HH:mm:ss',
        example_value: '2023-01-15 10:30:45',
        grok_pattern: 'TIMESTAMP_ISO8601',
      },
      log_level: {
        field_name: 'log.level',
        example_values: ['INFO', 'WARN', 'ERROR', 'DEBUG'],
        grok_pattern: 'LOGLEVEL',
      },
      other_fields: [],
    };

    it('should return 1.0 for all correctly extracted log levels', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: { 'log.level': 'INFO' },
          originalMessage: '[INFO] Test message',
        },
        {
          parsed: true,
          fields: { 'log.level': 'ERROR' },
          originalMessage: '[ERROR] Test message',
        },
      ];

      const accuracy = calculateLogLevelAccuracy(parsedLogs, expectedFields);
      expect(accuracy).toBe(1.0);
    });

    it('should be case-insensitive', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: { 'log.level': 'info' },
          originalMessage: '[info] Test message',
        },
        {
          parsed: true,
          fields: { 'log.level': 'Error' },
          originalMessage: '[Error] Test message',
        },
      ];

      const accuracy = calculateLogLevelAccuracy(parsedLogs, expectedFields);
      expect(accuracy).toBe(1.0);
    });

    it('should handle common log level variations', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: { 'log.level': 'warning' }, // variation of WARN
          originalMessage: '[warning] Test message',
        },
        {
          parsed: true,
          fields: { 'log.level': 'err' }, // variation of ERROR
          originalMessage: '[err] Test message',
        },
      ];

      const accuracy = calculateLogLevelAccuracy(parsedLogs, expectedFields);
      expect(accuracy).toBe(1.0);
    });

    it('should return 0.0 for incorrect log levels', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: { 'log.level': 'INVALID' },
          originalMessage: '[INVALID] Test message',
        },
      ];

      const accuracy = calculateLogLevelAccuracy(parsedLogs, expectedFields);
      expect(accuracy).toBe(0.0);
    });

    it('should return 0.0 when no log level field expected', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: { 'log.level': 'INFO' },
          originalMessage: '[INFO] Test message',
        },
      ];

      const noLevelFields: PatternExtractionGroundTruth['expected_fields'] = {
        timestamp: {
          field_name: '@timestamp',
          format: 'yyyy-MM-dd HH:mm:ss',
          example_value: '2023-01-15 10:30:45',
          grok_pattern: 'TIMESTAMP_ISO8601',
        },
        other_fields: [],
      };

      const accuracy = calculateLogLevelAccuracy(parsedLogs, noLevelFields);
      expect(accuracy).toBe(0.0);
    });
  });

  describe('calculateFieldQuality', () => {
    const expectedFields: PatternExtractionGroundTruth['expected_fields'] = {
      timestamp: {
        field_name: '@timestamp',
        format: 'yyyy-MM-dd HH:mm:ss',
        example_value: '2023-01-15 10:30:45',
        grok_pattern: 'TIMESTAMP_ISO8601',
      },
      other_fields: [
        {
          name: 'user.name',
          type: 'keyword',
          example_values: ['alice', 'bob'],
          required: true,
          grok_pattern: 'WORD',
        },
        {
          name: 'message',
          type: 'text',
          example_values: ['User logged in', 'User logged out'],
          required: true,
          grok_pattern: 'GREEDYDATA',
        },
        {
          name: 'user.id',
          type: 'number',
          example_values: ['123', '456'],
          required: false,
          grok_pattern: 'NUMBER',
        },
      ],
    };

    it('should return high score when all required fields extracted correctly', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: {
            'user.name': 'alice',
            message: 'User logged in successfully',
          },
          originalMessage: 'alice: User logged in successfully',
        },
      ];

      const quality = calculateFieldQuality(parsedLogs, expectedFields);
      expect(quality).toBeGreaterThanOrEqual(0.8);
    });

    it('should give higher score with optional fields included', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: {
            'user.name': 'alice',
            message: 'User logged in successfully',
            'user.id': '123',
          },
          originalMessage: 'alice [123]: User logged in successfully',
        },
      ];

      const quality = calculateFieldQuality(parsedLogs, expectedFields);
      expect(quality).toBeGreaterThan(0.9);
    });

    it('should penalize missing required fields', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: {
            message: 'User logged in successfully',
            // Missing required 'user.name'
          },
          originalMessage: 'User logged in successfully',
        },
      ];

      const quality = calculateFieldQuality(parsedLogs, expectedFields);
      expect(quality).toBeLessThan(0.6);
    });

    it('should penalize junk/unexpected fields', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: {
            'user.name': 'alice',
            message: 'User logged in successfully',
            junk1: 'random',
            junk2: 'noise',
            junk3: 'garbage',
          },
          originalMessage: 'alice: User logged in successfully random noise garbage',
        },
      ];

      const qualityWithJunk = calculateFieldQuality(parsedLogs, expectedFields);

      const parsedLogsClean: ParsedLog[] = [
        {
          parsed: true,
          fields: {
            'user.name': 'alice',
            message: 'User logged in successfully',
          },
          originalMessage: 'alice: User logged in successfully',
        },
      ];

      const qualityClean = calculateFieldQuality(parsedLogsClean, expectedFields);

      expect(qualityWithJunk).toBeLessThan(qualityClean);
    });

    it('should return 0 for unparsed logs', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: false,
          fields: {},
          originalMessage: 'Unparsed log',
        },
      ];

      const quality = calculateFieldQuality(parsedLogs, expectedFields);
      expect(quality).toBe(0.0);
    });
  });

  describe('calculateFieldCountPenalty', () => {
    const patternCharacteristics: PatternExtractionGroundTruth['pattern_characteristics'] = {
      should_handle_optional_fields: false,
      expected_min_fields: 3,
      expected_max_fields: 5,
    };

    it('should return 1.0 (no penalty) when field count is within range', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: { field1: 'a', field2: 'b', field3: 'c' }, // 3 fields (min)
          originalMessage: 'test',
        },
        {
          parsed: true,
          fields: { field1: 'a', field2: 'b', field3: 'c', field4: 'd', field5: 'e' }, // 5 fields (max)
          originalMessage: 'test',
        },
      ];

      const score = calculateFieldCountPenalty(parsedLogs, patternCharacteristics);
      expect(score).toBe(1.0);
    });

    it('should penalize too few fields', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: { field1: 'a' }, // Only 1 field, need 3-5
          originalMessage: 'test',
        },
      ];

      const score = calculateFieldCountPenalty(parsedLogs, patternCharacteristics);
      expect(score).toBeLessThan(1.0);
      expect(score).toBeGreaterThan(0);
    });

    it('should penalize too many fields', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: {
            field1: 'a',
            field2: 'b',
            field3: 'c',
            field4: 'd',
            field5: 'e',
            field6: 'f',
            field7: 'g',
            field8: 'h',
          }, // 8 fields, max is 5
          originalMessage: 'test',
        },
      ];

      const score = calculateFieldCountPenalty(parsedLogs, patternCharacteristics);
      expect(score).toBeLessThan(1.0);
      expect(score).toBeGreaterThan(0);
    });

    it('should give maximum penalty for unparsed logs', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: false,
          fields: {},
          originalMessage: 'Unparsed log',
        },
      ];

      const score = calculateFieldCountPenalty(parsedLogs, patternCharacteristics);
      expect(score).toBe(0.0);
    });

    it('should return 0 for empty logs array', () => {
      const score = calculateFieldCountPenalty([], patternCharacteristics);
      expect(score).toBe(0.0);
    });

    it('should return 0 if pattern characteristics undefined', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: { field1: 'a' },
          originalMessage: 'test',
        },
      ];

      const score = calculateFieldCountPenalty(parsedLogs, undefined);
      expect(score).toBe(0.0);
    });
  });

  describe('calculateOverallQuality', () => {
    const groundTruth: PatternExtractionGroundTruth = {
      source_id: 'test',
      source_type: 'synthetic',
      integration_package: '',
      sample_messages: [],
      expected_fields: {
        timestamp: {
          field_name: '@timestamp',
          format: 'yyyy-MM-dd HH:mm:ss',
          example_value: '2023-01-15 10:30:45',
          grok_pattern: 'TIMESTAMP_ISO8601',
        },
        log_level: {
          field_name: 'log.level',
          example_values: ['INFO', 'ERROR'],
          grok_pattern: 'LOGLEVEL',
        },
        other_fields: [
          {
            name: 'message',
            type: 'text',
            example_values: ['Test message'],
            required: true,
            grok_pattern: 'GREEDYDATA',
          },
        ],
      },
      pattern_characteristics: {
        should_handle_optional_fields: false,
        expected_min_fields: 3,
        expected_max_fields: 4,
      },
    };

    it('should return perfect scores for perfectly parsed logs', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: {
            '@timestamp': '2023-01-15 10:30:45',
            'log.level': 'INFO',
            message: 'Test message one',
          },
          originalMessage: '[2023-01-15 10:30:45] INFO Test message one',
        },
        {
          parsed: true,
          fields: {
            '@timestamp': '2023-01-15 10:30:46',
            'log.level': 'ERROR',
            message: 'Test message two',
          },
          originalMessage: '[2023-01-15 10:30:46] ERROR Test message two',
        },
      ];

      const metrics: PatternQualityMetrics = calculateOverallQuality(parsedLogs, groundTruth);

      expect(metrics.parseRate).toBe(1.0);
      expect(metrics.timestampAccuracy).toBe(1.0);
      expect(metrics.logLevelAccuracy).toBe(1.0);
      expect(metrics.fieldQuality).toBeGreaterThan(0.8);
      expect(metrics.fieldCountPenalty).toBe(0.0);
      expect(metrics.overallQuality).toBeGreaterThan(0.85);
    });

    it('should return low scores for unparsed logs', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: false,
          fields: {},
          originalMessage: 'Completely unparsed log',
        },
      ];

      const metrics: PatternQualityMetrics = calculateOverallQuality(parsedLogs, groundTruth);

      expect(metrics.parseRate).toBe(0.0);
      expect(metrics.timestampAccuracy).toBe(0.0);
      expect(metrics.logLevelAccuracy).toBe(0.0);
      expect(metrics.fieldQuality).toBe(0.0);
      expect(metrics.overallQuality).toBeLessThan(0.2);
    });

    it('should handle mixed quality scenarios', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: {
            '@timestamp': '2023-01-15 10:30:45',
            'log.level': 'INFO',
            message: 'Good log',
          },
          originalMessage: '[2023-01-15 10:30:45] INFO Good log',
        },
        {
          parsed: true,
          fields: {
            'log.level': 'ERROR',
            message: 'Missing timestamp',
          },
          originalMessage: 'ERROR Missing timestamp',
        },
        {
          parsed: false,
          fields: {},
          originalMessage: 'Unparsed',
        },
      ];

      const metrics: PatternQualityMetrics = calculateOverallQuality(parsedLogs, groundTruth);

      expect(metrics.parseRate).toBeCloseTo(0.67, 1);
      expect(metrics.timestampAccuracy).toBeGreaterThan(0);
      expect(metrics.timestampAccuracy).toBeLessThan(0.5);
      expect(metrics.logLevelAccuracy).toBeGreaterThan(0.5);
      expect(metrics.overallQuality).toBeGreaterThan(0.3);
      expect(metrics.overallQuality).toBeLessThan(0.7);
    });

    it('should not penalize when log level is not expected', () => {
      const groundTruthNoLevel: PatternExtractionGroundTruth = {
        ...groundTruth,
        expected_fields: {
          ...groundTruth.expected_fields,
          log_level: undefined,
        },
      };

      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: {
            '@timestamp': '2023-01-15 10:30:45',
            message: 'Test message',
          },
          originalMessage: '2023-01-15 10:30:45 Test message',
        },
      ];

      const metrics: PatternQualityMetrics = calculateOverallQuality(
        parsedLogs,
        groundTruthNoLevel
      );

      expect(metrics.logLevelAccuracy).toBe(1.0); // Should default to 1.0 when not expected
      expect(metrics.overallQuality).toBeGreaterThan(0.7);
    });

    it('should weight all metrics according to specified weights', () => {
      const parsedLogs: ParsedLog[] = [
        {
          parsed: true,
          fields: {
            '@timestamp': '2023-01-15 10:30:45',
            'log.level': 'INFO',
            message: 'Test',
          },
          originalMessage: 'test',
        },
      ];

      const metrics: PatternQualityMetrics = calculateOverallQuality(parsedLogs, groundTruth);

      // Overall should be weighted average:
      // parseRate * 0.25 + timestampAccuracy * 0.20 + logLevelAccuracy * 0.15 +
      // fieldQuality * 0.30 + (1 - fieldCountPenalty) * 0.10
      const expectedOverall =
        metrics.parseRate * 0.25 +
        metrics.timestampAccuracy * 0.2 +
        metrics.logLevelAccuracy * 0.15 +
        metrics.fieldQuality * 0.3 +
        (1.0 - metrics.fieldCountPenalty) * 0.1;

      expect(metrics.overallQuality).toBeCloseTo(expectedOverall, 5);
    });
  });
});
