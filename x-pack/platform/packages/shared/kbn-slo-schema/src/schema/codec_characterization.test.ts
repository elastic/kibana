/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Characterization tests for the io-ts codecs of @kbn/slo-schema.
 *
 * They pin the current decode/encode/guard behavior through the codec-agnostic
 * helpers in ../test_helpers/codec_agnostic, so the exact same expectations must
 * keep passing once each schema is migrated to zod.
 */

import { Duration, DurationUnit } from '../models/duration';
import {
  allWireIndicators,
  buildDomainSLO,
  buildWireSLO,
  FIXED_DATE_ISO,
} from '../test_helpers/fixtures';
import { decode, encode, is } from '../test_helpers/codec_agnostic';
import { dateType } from './common';
import { durationType } from './duration';
import { indicatorSchema, indicatorTypesArraySchema } from './indicators';
import {
  boundedProjectRoutingSchema,
  sloDefinitionSchema,
  sloIdSchema,
  storedSloDefinitionSchema,
} from './slo';
import { rollingTimeWindowSchema, timeWindowSchema } from './time_window';

describe('durationType', () => {
  it.each([
    ['1m', 1, DurationUnit.Minute],
    ['2h', 2, DurationUnit.Hour],
    ['30d', 30, DurationUnit.Day],
    ['1w', 1, DurationUnit.Week],
    ['6M', 6, DurationUnit.Month],
  ])('decodes %s into a Duration instance', (input, value, unit) => {
    const result = decode(durationType, input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBeInstanceOf(Duration);
      expect(result.value.isEqual(new Duration(value, unit))).toBe(true);
    }
  });

  it.each(['0d', '-5m', '5x', 'abc', '30', '', 42, null, undefined, {}])(
    'fails decoding invalid duration %p',
    (input) => {
      expect(decode(durationType, input).success).toBe(false);
    }
  );

  it('encodes a Duration back to its string form', () => {
    expect(encode(durationType, new Duration(30, DurationUnit.Day))).toBe('30d');
  });

  it('round-trips through decode then encode', () => {
    const result = decode(durationType, '7d');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(encode(durationType, result.value)).toBe('7d');
    }
  });

  it('guards on the decoded side only', () => {
    expect(is(durationType, new Duration(30, DurationUnit.Day))).toBe(true);
    expect(is(durationType, '30d')).toBe(false);
  });
});

describe('dateType', () => {
  it('decodes an ISO string into a Date instance', () => {
    const result = decode(dateType, FIXED_DATE_ISO);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBeInstanceOf(Date);
      expect(result.value.getTime()).toBe(new Date(FIXED_DATE_ISO).getTime());
    }
  });

  it.each(['not-a-date', '', 42, null, undefined, {}])(
    'fails decoding invalid date %p',
    (input) => {
      expect(decode(dateType, input).success).toBe(false);
    }
  );

  it('encodes a Date to its ISO string form', () => {
    expect(encode(dateType, new Date(FIXED_DATE_ISO))).toBe(FIXED_DATE_ISO);
  });

  it('round-trips through decode then encode', () => {
    const result = decode(dateType, FIXED_DATE_ISO);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(encode(dateType, result.value)).toBe(FIXED_DATE_ISO);
    }
  });

  it('guards on the decoded side only', () => {
    expect(is(dateType, new Date(FIXED_DATE_ISO))).toBe(true);
    expect(is(dateType, FIXED_DATE_ISO)).toBe(false);
  });
});

describe('sloIdSchema', () => {
  it.each(['a'.repeat(8), 'a'.repeat(48), 'my-slo-id_01', '12345678'])(
    'accepts valid id %s',
    (input) => {
      const result = decode(sloIdSchema, input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(input);
      }
    }
  );

  it.each(['a'.repeat(7), 'a'.repeat(49), 'UPPERCASE1', 'with space1', 'special!chars', 42, null])(
    'rejects invalid id %p',
    (input) => {
      expect(decode(sloIdSchema, input).success).toBe(false);
    }
  );

  it('encodes as identity', () => {
    expect(encode(sloIdSchema, 'my-slo-id01')).toBe('my-slo-id01');
  });
});

describe('boundedProjectRoutingSchema', () => {
  it.each(['_alias:_origin', '_alias:*', 'x'.repeat(8192)])('accepts %s', (input) => {
    const result = decode(boundedProjectRoutingSchema, input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe(input);
    }
  });

  it.each(['', '   ', 'x'.repeat(8193), 42, null])('rejects %p', (input) => {
    expect(decode(boundedProjectRoutingSchema, input).success).toBe(false);
  });
});

describe('indicatorTypesArraySchema', () => {
  it('decodes a single indicator type', () => {
    const result = decode(indicatorTypesArraySchema, 'sli.kql.custom');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toEqual(['sli.kql.custom']);
    }
  });

  it('decodes a comma-separated list of indicator types', () => {
    const result = decode(indicatorTypesArraySchema, 'sli.kql.custom,sli.apm.transactionDuration');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toEqual(['sli.kql.custom', 'sli.apm.transactionDuration']);
    }
  });

  it.each(['sli.kql.custom,unknown.type', 'unknown.type', '', 42, ['sli.kql.custom']])(
    'fails decoding %p',
    (input) => {
      expect(decode(indicatorTypesArraySchema, input).success).toBe(false);
    }
  );

  it('encodes an array back to a comma-separated string', () => {
    expect(encode(indicatorTypesArraySchema, ['sli.kql.custom', 'sli.histogram.custom'])).toBe(
      'sli.kql.custom,sli.histogram.custom'
    );
  });
});

describe('indicatorSchema', () => {
  it.each(allWireIndicators.map((indicator) => [indicator.type, indicator]))(
    'decodes a %s indicator',
    (_type, indicator) => {
      const result = decode(indicatorSchema, indicator);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(indicator);
      }
    }
  );

  it('rejects an unknown indicator type', () => {
    expect(
      decode(indicatorSchema, { type: 'sli.unknown', params: { index: 'my-index*' } }).success
    ).toBe(false);
  });

  it('rejects a kql custom indicator missing required params', () => {
    expect(
      decode(indicatorSchema, {
        type: 'sli.kql.custom',
        params: { index: 'my-index*', good: 'latency < 300' },
      }).success
    ).toBe(false);
  });
});

describe('timeWindowSchema', () => {
  it('decodes a rolling time window', () => {
    const result = decode(timeWindowSchema, { duration: '30d', type: 'rolling' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.type).toBe('rolling');
      expect(result.value.duration).toBeInstanceOf(Duration);
      expect(result.value.duration.isEqual(new Duration(30, DurationUnit.Day))).toBe(true);
    }
  });

  it('decodes a calendar aligned time window', () => {
    const result = decode(timeWindowSchema, { duration: '1M', type: 'calendarAligned' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.type).toBe('calendarAligned');
      expect(result.value.duration.isEqual(new Duration(1, DurationUnit.Month))).toBe(true);
    }
  });

  it.each([
    { duration: '30d', type: 'unknown' },
    { duration: '0d', type: 'rolling' },
    { type: 'rolling' },
    'not-an-object',
  ])('fails decoding invalid time window %p', (input) => {
    expect(decode(timeWindowSchema, input).success).toBe(false);
  });

  it('encodes durations back to their string form', () => {
    expect(
      encode(timeWindowSchema, { duration: new Duration(30, DurationUnit.Day), type: 'rolling' })
    ).toEqual({ duration: '30d', type: 'rolling' });
  });

  it('guards on the decoded side only', () => {
    expect(
      is(rollingTimeWindowSchema, {
        duration: new Duration(30, DurationUnit.Day),
        type: 'rolling',
      })
    ).toBe(true);
    expect(is(rollingTimeWindowSchema, { duration: '30d', type: 'rolling' })).toBe(false);
  });
});

describe('sloDefinitionSchema', () => {
  it('decodes a stored SLO into its domain form', () => {
    const result = decode(sloDefinitionSchema, buildWireSLO());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.createdAt).toBeInstanceOf(Date);
      expect(result.value.updatedAt).toBeInstanceOf(Date);
      expect(result.value.timeWindow.duration).toBeInstanceOf(Duration);
      expect(result.value.settings.syncDelay).toBeInstanceOf(Duration);
      expect(result.value.settings.frequency).toBeInstanceOf(Duration);
      expect(result.value.groupBy).toBe('*');
    }
  });

  it('decodes optional createdBy/updatedBy and artifacts', () => {
    const result = decode(sloDefinitionSchema, {
      ...buildWireSLO(),
      createdBy: 'someone',
      updatedBy: 'someone-else',
      artifacts: { dashboards: [{ id: 'dashboard-id' }] },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.createdBy).toBe('someone');
      expect(result.value.artifacts).toEqual({ dashboards: [{ id: 'dashboard-id' }] });
    }
  });

  it.each(['version', 'indicator', 'settings', 'timeWindow'])(
    'fails decoding when %s is missing',
    (field) => {
      const wireSLO: Record<string, unknown> = buildWireSLO();
      delete wireSLO[field];
      expect(decode(sloDefinitionSchema, wireSLO).success).toBe(false);
    }
  );
});

describe('storedSloDefinitionSchema', () => {
  it('encodes a domain SLO back to its stored form', () => {
    expect(encode(storedSloDefinitionSchema, buildDomainSLO())).toEqual(buildWireSLO());
  });
});
