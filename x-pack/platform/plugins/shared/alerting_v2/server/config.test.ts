/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema, getQueryRowLimit, NON_STREAMING_MAX_ROWS } from './config';

describe('alerting_v2 config schema', () => {
  describe('enabled', () => {
    it('defaults to true', () => {
      const config = configSchema.validate({});
      expect(config.enabled).toBe(true);
    });

    it('can be turned off', () => {
      expect(configSchema.validate({ enabled: false }).enabled).toBe(false);
    });
  });

  describe('rules.minimumScheduleInterval', () => {
    it('defaults to 1m', () => {
      const config = configSchema.validate({});
      expect(config.rules.minimumScheduleInterval).toBe('1m');
    });

    it('accepts a value between the floor and the ceiling', () => {
      expect(
        configSchema.validate({ rules: { minimumScheduleInterval: '12h' } }).rules
          .minimumScheduleInterval
      ).toBe('12h');
    });

    it('accepts the 5s floor used by functional tests', () => {
      expect(
        configSchema.validate({ rules: { minimumScheduleInterval: '5s' } }).rules
          .minimumScheduleInterval
      ).toBe('5s');
    });

    it('rejects a malformed duration', () => {
      expect(() =>
        configSchema.validate({ rules: { minimumScheduleInterval: 'nonsense' } })
      ).toThrow(/Invalid duration/);
    });

    it('rejects a value below the 5s floor', () => {
      expect(() => configSchema.validate({ rules: { minimumScheduleInterval: '1s' } })).toThrow(
        /cannot be less than 5s/
      );
    });

    it('rejects a value above the 30d ceiling', () => {
      expect(() => configSchema.validate({ rules: { minimumScheduleInterval: '31d' } })).toThrow(
        /cannot exceed 30d/
      );
    });
  });

  describe('rules.maxScheduledPerMinute', () => {
    it('defaults to 400', () => {
      const config = configSchema.validate({});
      expect(config.rules.maxScheduledPerMinute).toBe(400);
    });

    it('rejects negative values', () => {
      expect(() => configSchema.validate({ rules: { maxScheduledPerMinute: -1 } })).toThrow();
    });

    it('rejects values above 32000', () => {
      expect(() => configSchema.validate({ rules: { maxScheduledPerMinute: 32001 } })).toThrow();
    });
  });

  describe('rules.run.alerts.max', () => {
    it('defaults to 10000', () => {
      const config = configSchema.validate({});
      expect(config.rules.run.alerts.max).toBe(10000);
    });

    it('accepts a smaller configured value', () => {
      expect(
        configSchema.validate({ rules: { run: { alerts: { max: 100 } } } }).rules.run.alerts.max
      ).toBe(100);
    });

    it('rejects values below 1', () => {
      expect(() => configSchema.validate({ rules: { run: { alerts: { max: 0 } } } })).toThrow();
    });

    it('rejects values above the 10000 ceiling', () => {
      expect(() => configSchema.validate({ rules: { run: { alerts: { max: 10001 } } } })).toThrow();
    });
  });

  describe('rules.run.maxGroupsPerExecution', () => {
    it('defaults to 10000', () => {
      const config = configSchema.validate({});
      expect(config.rules.run.maxGroupsPerExecution).toBe(10000);
    });

    it('accepts a smaller configured value', () => {
      expect(
        configSchema.validate({ rules: { run: { maxGroupsPerExecution: 500 } } }).rules.run
          .maxGroupsPerExecution
      ).toBe(500);
    });

    it('rejects values below 1', () => {
      expect(() =>
        configSchema.validate({ rules: { run: { maxGroupsPerExecution: 0 } } })
      ).toThrow();
    });

    it('rejects values above the 10000 ceiling', () => {
      expect(() =>
        configSchema.validate({ rules: { run: { maxGroupsPerExecution: 10001 } } })
      ).toThrow();
    });
  });

  describe('getQueryRowLimit', () => {
    it('uses min(alerts.max, NON_STREAMING_MAX_ROWS) for the json response format', () => {
      const config = configSchema.validate({ esql: { responseFormat: 'json' } });
      expect(getQueryRowLimit(config)).toBe(NON_STREAMING_MAX_ROWS);
    });

    it('uses alerts.max for the arrow response format', () => {
      const config = configSchema.validate({ esql: { responseFormat: 'arrow' } });
      expect(getQueryRowLimit(config)).toBe(10000);
    });

    it('honors a lower alerts.max on the json response format', () => {
      const config = configSchema.validate({
        esql: { responseFormat: 'json' },
        rules: { run: { alerts: { max: 500 } } },
      });
      expect(getQueryRowLimit(config)).toBe(500);
    });

    it('honors a lower alerts.max on the arrow response format', () => {
      const config = configSchema.validate({
        esql: { responseFormat: 'arrow' },
        rules: { run: { alerts: { max: 500 } } },
      });
      expect(getQueryRowLimit(config)).toBe(500);
    });
  });

  describe('rules.run.query.maxResponseSize', () => {
    it('defaults to 50 MB', () => {
      const config = configSchema.validate({});
      expect(config.rules.run.query.maxResponseSize).toBe(50 * 1024 * 1024);
    });

    it('accepts a configured value', () => {
      expect(
        configSchema.validate({ rules: { run: { query: { maxResponseSize: 1024 } } } }).rules.run
          .query.maxResponseSize
      ).toBe(1024);
    });

    it('rejects values below 1024 bytes', () => {
      expect(() =>
        configSchema.validate({ rules: { run: { query: { maxResponseSize: 1023 } } } })
      ).toThrow();
    });
  });

  describe('rules.run.timeout', () => {
    it('defaults to undefined', () => {
      const config = configSchema.validate({});
      expect(config.rules.run.timeout).toBeUndefined();
    });

    it('accepts a valid duration', () => {
      expect(configSchema.validate({ rules: { run: { timeout: '5m' } } }).rules.run.timeout).toBe(
        '5m'
      );
    });

    it('rejects a malformed duration', () => {
      expect(() => configSchema.validate({ rules: { run: { timeout: 'nonsense' } } })).toThrow(
        /Invalid duration/
      );
    });
  });

  describe('esql.responseFormat', () => {
    it('defaults to json', () => {
      const config = configSchema.validate({});
      expect(config.esql.responseFormat).toBe('json');
    });

    it('accepts arrow', () => {
      expect(configSchema.validate({ esql: { responseFormat: 'arrow' } }).esql.responseFormat).toBe(
        'arrow'
      );
    });

    it('rejects an unknown format', () => {
      expect(() => configSchema.validate({ esql: { responseFormat: 'csv' } })).toThrow();
    });
  });
});
