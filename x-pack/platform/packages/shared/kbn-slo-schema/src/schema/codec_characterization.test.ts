/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Characterization tests for the codecs of @kbn/slo-schema.
 *
 * They pin the io-ts decode/encode/guard behavior through the codec-agnostic
 * helpers in ../test_helpers/codec_agnostic, and every suite runs against both
 * the io-ts codec and its zod twin: the exact same expectations must pass for
 * both, proving the twins are behaviorally equivalent before any consumer is
 * switched over.
 */

import type * as t from 'io-ts';
import type { z } from '@kbn/zod';
import { Duration, DurationUnit } from '../models/duration';
import {
  allWireIndicators,
  buildDomainSLO,
  buildWireSLO,
  FIXED_DATE_ISO,
} from '../test_helpers/fixtures';
import type { DecodeOutcome } from '../test_helpers/codec_agnostic';
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
import {
  boundedProjectRoutingSchema as boundedProjectRoutingSchemaZod,
  dateType as dateTypeZod,
  durationType as durationTypeZod,
  indicatorSchema as indicatorSchemaZod,
  indicatorTypesArraySchema as indicatorTypesArraySchemaZod,
  rollingTimeWindowSchema as rollingTimeWindowSchemaZod,
  sloDefinitionSchema as sloDefinitionSchemaZod,
  sloIdSchema as sloIdSchemaZod,
  storedSloDefinitionSchema as storedSloDefinitionSchemaZod,
  timeWindowSchema as timeWindowSchemaZod,
} from './zod';

/** A codec bound to the flavor-agnostic helpers, so suites can run against both flavors. */
interface CodecUnderTest<A> {
  flavor: 'io-ts' | 'zod';
  decode: (input: unknown) => DecodeOutcome<A>;
  encode: (value: A) => unknown;
  is: (value: unknown) => boolean;
}

const ioTsCodec = <A, O>(codec: t.Type<A, O, unknown>): CodecUnderTest<A> => ({
  flavor: 'io-ts',
  decode: (input) => decode(codec, input),
  encode: (value) => encode(codec, value),
  is: (value) => is(codec, value),
});

const zodCodec = <S extends z.ZodType>(schema: S): CodecUnderTest<z.output<S>> => ({
  flavor: 'zod',
  decode: (input) => decode(schema, input),
  encode: (value) => encode(schema, value),
  is: (value) => is(schema, value),
});

describe.each([ioTsCodec(durationType), zodCodec(durationTypeZod)])(
  'durationType ($flavor)',
  (codec) => {
    it.each([
      ['1m', 1, DurationUnit.Minute],
      ['2h', 2, DurationUnit.Hour],
      ['30d', 30, DurationUnit.Day],
      ['1w', 1, DurationUnit.Week],
      ['6M', 6, DurationUnit.Month],
    ])('decodes %s into a Duration instance', (input, value, unit) => {
      const result = codec.decode(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Duration);
        expect(result.value.isEqual(new Duration(value, unit))).toBe(true);
      }
    });

    it.each(['0d', '-5m', '5x', 'abc', '30', '', 42, null, undefined, {}])(
      'fails decoding invalid duration %p',
      (input) => {
        expect(codec.decode(input).success).toBe(false);
      }
    );

    it('encodes a Duration back to its string form', () => {
      expect(codec.encode(new Duration(30, DurationUnit.Day))).toBe('30d');
    });

    it('round-trips through decode then encode', () => {
      const result = codec.decode('7d');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(codec.encode(result.value)).toBe('7d');
      }
    });

    it('guards on the decoded side only', () => {
      expect(codec.is(new Duration(30, DurationUnit.Day))).toBe(true);
      expect(codec.is('30d')).toBe(false);
    });
  }
);

describe.each([ioTsCodec(dateType), zodCodec(dateTypeZod)])('dateType ($flavor)', (codec) => {
  it('decodes an ISO string into a Date instance', () => {
    const result = codec.decode(FIXED_DATE_ISO);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBeInstanceOf(Date);
      expect(result.value.getTime()).toBe(new Date(FIXED_DATE_ISO).getTime());
    }
  });

  it.each(['not-a-date', '', 42, null, undefined, {}])(
    'fails decoding invalid date %p',
    (input) => {
      expect(codec.decode(input).success).toBe(false);
    }
  );

  it('encodes a Date to its ISO string form', () => {
    expect(codec.encode(new Date(FIXED_DATE_ISO))).toBe(FIXED_DATE_ISO);
  });

  it('round-trips through decode then encode', () => {
    const result = codec.decode(FIXED_DATE_ISO);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(codec.encode(result.value)).toBe(FIXED_DATE_ISO);
    }
  });

  it('guards on the decoded side only', () => {
    expect(codec.is(new Date(FIXED_DATE_ISO))).toBe(true);
    expect(codec.is(FIXED_DATE_ISO)).toBe(false);
  });
});

describe.each([ioTsCodec(sloIdSchema), zodCodec(sloIdSchemaZod)])(
  'sloIdSchema ($flavor)',
  (codec) => {
    it.each(['a'.repeat(8), 'a'.repeat(48), 'my-slo-id_01', '12345678'])(
      'accepts valid id %s',
      (input) => {
        const result = codec.decode(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(input);
        }
      }
    );

    it.each([
      'a'.repeat(7),
      'a'.repeat(49),
      'UPPERCASE1',
      'with space1',
      'special!chars',
      42,
      null,
    ])('rejects invalid id %p', (input) => {
      expect(codec.decode(input).success).toBe(false);
    });

    it('encodes as identity', () => {
      expect(codec.encode('my-slo-id01')).toBe('my-slo-id01');
    });
  }
);

describe.each([ioTsCodec(boundedProjectRoutingSchema), zodCodec(boundedProjectRoutingSchemaZod)])(
  'boundedProjectRoutingSchema ($flavor)',
  (codec) => {
    it.each(['_alias:_origin', '_alias:*', 'x'.repeat(8192)])('accepts %s', (input) => {
      const result = codec.decode(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(input);
      }
    });

    it.each(['', '   ', 'x'.repeat(8193), 42, null])('rejects %p', (input) => {
      expect(codec.decode(input).success).toBe(false);
    });
  }
);

describe.each([ioTsCodec(indicatorTypesArraySchema), zodCodec(indicatorTypesArraySchemaZod)])(
  'indicatorTypesArraySchema ($flavor)',
  (codec) => {
    it('decodes a single indicator type', () => {
      const result = codec.decode('sli.kql.custom');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(['sli.kql.custom']);
      }
    });

    it('decodes a comma-separated list of indicator types', () => {
      const result = codec.decode('sli.kql.custom,sli.apm.transactionDuration');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(['sli.kql.custom', 'sli.apm.transactionDuration']);
      }
    });

    it.each(['sli.kql.custom,unknown.type', 'unknown.type', '', 42, ['sli.kql.custom']])(
      'fails decoding %p',
      (input) => {
        expect(codec.decode(input).success).toBe(false);
      }
    );

    it('encodes an array back to a comma-separated string', () => {
      expect(codec.encode(['sli.kql.custom', 'sli.histogram.custom'])).toBe(
        'sli.kql.custom,sli.histogram.custom'
      );
    });
  }
);

describe.each([ioTsCodec(indicatorSchema), zodCodec(indicatorSchemaZod)])(
  'indicatorSchema ($flavor)',
  (codec) => {
    it.each(allWireIndicators.map((indicator) => [indicator.type, indicator]))(
      'decodes a %s indicator',
      (_type, indicator) => {
        const result = codec.decode(indicator);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toEqual(indicator);
        }
      }
    );

    it('rejects an unknown indicator type', () => {
      expect(codec.decode({ type: 'sli.unknown', params: { index: 'my-index*' } }).success).toBe(
        false
      );
    });

    it('rejects a kql custom indicator missing required params', () => {
      expect(
        codec.decode({
          type: 'sli.kql.custom',
          params: { index: 'my-index*', good: 'latency < 300' },
        }).success
      ).toBe(false);
    });
  }
);

describe('timeWindowSchema', () => {
  describe.each([ioTsCodec(timeWindowSchema), zodCodec(timeWindowSchemaZod)])(
    '($flavor)',
    (codec) => {
      it('decodes a rolling time window', () => {
        const result = codec.decode({ duration: '30d', type: 'rolling' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.type).toBe('rolling');
          expect(result.value.duration).toBeInstanceOf(Duration);
          expect(result.value.duration.isEqual(new Duration(30, DurationUnit.Day))).toBe(true);
        }
      });

      it('decodes a calendar aligned time window', () => {
        const result = codec.decode({ duration: '1M', type: 'calendarAligned' });
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
        expect(codec.decode(input).success).toBe(false);
      });

      it('encodes durations back to their string form', () => {
        expect(
          codec.encode({ duration: new Duration(30, DurationUnit.Day), type: 'rolling' })
        ).toEqual({ duration: '30d', type: 'rolling' });
      });
    }
  );

  describe.each([ioTsCodec(rollingTimeWindowSchema), zodCodec(rollingTimeWindowSchemaZod)])(
    'rolling ($flavor)',
    (codec) => {
      it('guards on the decoded side only', () => {
        expect(
          codec.is({
            duration: new Duration(30, DurationUnit.Day),
            type: 'rolling',
          })
        ).toBe(true);
        expect(codec.is({ duration: '30d', type: 'rolling' })).toBe(false);
      });
    }
  );
});

describe.each([ioTsCodec(sloDefinitionSchema), zodCodec(sloDefinitionSchemaZod)])(
  'sloDefinitionSchema ($flavor)',
  (codec) => {
    it('decodes a stored SLO into its domain form', () => {
      const result = codec.decode(buildWireSLO());
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
      const result = codec.decode({
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
        expect(codec.decode(wireSLO).success).toBe(false);
      }
    );
  }
);

describe.each([ioTsCodec(storedSloDefinitionSchema), zodCodec(storedSloDefinitionSchemaZod)])(
  'storedSloDefinitionSchema ($flavor)',
  (codec) => {
    it('encodes a domain SLO back to its stored form', () => {
      expect(codec.encode(buildDomainSLO())).toEqual(buildWireSLO());
    });
  }
);
