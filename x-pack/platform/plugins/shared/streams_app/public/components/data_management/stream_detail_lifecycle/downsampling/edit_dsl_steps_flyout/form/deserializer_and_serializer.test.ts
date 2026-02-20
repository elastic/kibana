/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { IngestStreamLifecycleDSL } from '@kbn/streams-schema';

import { createDslStepsFlyoutDeserializer } from './deserializer';
import { createDslStepsFlyoutSerializer } from './serializer';
import type { DslStepsFlyoutFormInternal } from './types';
import { MAX_DOWNSAMPLE_STEPS } from './constants';

const unknownValue = { some: 'value' };

/** Lifecycle shape with preserved/unknown fields for serializer tests */
type LifecycleWithPreserved = IngestStreamLifecycleDSL & {
  unknown?: unknown;
  dsl?: IngestStreamLifecycleDSL['dsl'] & {
    enabled?: boolean;
    downsampling_method?: string;
    unknown?: unknown;
  };
};

/** Downsample step with optional unknown fields (stripped on serialize) */
type DownsampleStepWithExtras = IngestStreamLifecycleDSL['dsl'] extends { downsample?: infer D }
  ? D extends Array<infer S>
    ? S & { unknown_nested?: unknown }
    : never
  : never;

describe('streams DSL steps flyout deserializer and serializer', () => {
  const deserializer = createDslStepsFlyoutDeserializer();

  let lifecycle: LifecycleWithPreserved;
  let serializer: ReturnType<typeof createDslStepsFlyoutSerializer>;
  let formInternal: DslStepsFlyoutFormInternal;

  beforeEach(() => {
    lifecycle = {
      dsl: {
        data_retention: '30d',
        enabled: true,
        downsampling_method: 'something',
        downsample: [
          {
            after: '30d',
            fixed_interval: '1h',
            unknown_nested: unknownValue,
          } as DownsampleStepWithExtras,
          { after: '40d', fixed_interval: '5d' },
        ],
        // unknown fields should be preserved
        unknown: unknownValue,
      },
      unknown: unknownValue,
    };

    formInternal = deserializer(lifecycle);
    // clone here so we can mutate `lifecycle` while serializer keeps original reference semantics
    serializer = createDslStepsFlyoutSerializer(cloneDeep(lifecycle));
  });

  it('does not mutate the input lifecycle object', () => {
    const input = cloneDeep(lifecycle);
    const copy = cloneDeep(input);

    deserializer(input);
    expect(input).toEqual(copy);
  });

  it('preserves unknown DSL properties while removing per-step unknown fields', () => {
    const input = cloneDeep(lifecycle);

    const internal = deserializer(input);
    const out = createDslStepsFlyoutSerializer(input)(internal) as LifecycleWithPreserved;
    expect(out.unknown).toEqual(unknownValue);
    expect(out.dsl?.unknown).toEqual(unknownValue);
    expect(out.dsl?.enabled).toEqual(true);
    expect(out.dsl?.downsampling_method).toEqual('something');

    // Per-step unknown fields must not be preserved (Elasticsearch only accepts `after`/`fixed_interval`).
    expect(out.dsl?.downsample?.[0]).toEqual({ after: '30d', fixed_interval: '1h' });

    // Assert that the initial object passed to createDslStepsFlyoutSerializer() is not mutated.
    const copy = cloneDeep(input);
    createDslStepsFlyoutSerializer(input)(internal);
    expect(input).toEqual(copy);
  });

  it('deserializes empty lifecycle into schema-compatible defaults', () => {
    const internal = deserializer({} as IngestStreamLifecycleDSL);
    expect(internal._meta.downsampleSteps).toEqual([]);
  });

  it('deserializes step durations into UI meta fields', () => {
    const internal = deserializer({
      dsl: {
        data_retention: '30d',
        downsample: [{ after: '2d', fixed_interval: '2h' }],
      },
    });

    expect(internal._meta.downsampleSteps).toHaveLength(1);
    expect(internal._meta.downsampleSteps[0]).toEqual({
      afterValue: '2',
      afterUnit: 'd',
      afterToMilliSeconds: 2 * 86_400_000,
      fixedIntervalValue: '2',
      fixedIntervalUnit: 'h',
    });
  });

  it('round-trips preserved units like ms for after and fixed_interval', () => {
    const input: IngestStreamLifecycleDSL = {
      dsl: {
        data_retention: '30d',
        downsample: [{ after: '1500ms', fixed_interval: '300000ms' }],
      },
    };

    const internal = deserializer(input);
    expect(internal._meta.downsampleSteps[0].afterValue).toBe('1500');
    expect(internal._meta.downsampleSteps[0].afterUnit).toBe('ms');
    expect(internal._meta.downsampleSteps[0].afterToMilliSeconds).toBe(1500);
    expect(internal._meta.downsampleSteps[0].fixedIntervalValue).toBe('300000');
    expect(internal._meta.downsampleSteps[0].fixedIntervalUnit).toBe('ms');

    const out = createDslStepsFlyoutSerializer(cloneDeep(input))(internal);
    expect(out).toEqual(input);
  });

  it('defaults missing/invalid durations during deserialization', () => {
    const internal = deserializer({
      dsl: {
        downsample: [{ after: 'not_a_duration', fixed_interval: undefined }],
      },
    } as unknown as IngestStreamLifecycleDSL);

    expect(internal._meta.downsampleSteps).toHaveLength(1);
    expect(internal._meta.downsampleSteps[0]).toEqual({
      afterValue: '',
      afterUnit: 'd',
      afterToMilliSeconds: -1,
      fixedIntervalValue: '1',
      fixedIntervalUnit: 'd',
    });
  });

  it('serializes downsample steps from meta fields', () => {
    const internal: DslStepsFlyoutFormInternal = cloneDeep(formInternal);

    internal._meta.downsampleSteps[0] = {
      ...internal._meta.downsampleSteps[0],
      afterValue: '41',
      afterUnit: 'd',
      afterToMilliSeconds: 41 * 86_400_000,
      fixedIntervalValue: '10',
      fixedIntervalUnit: 'd',
    };

    const out = serializer(internal) as LifecycleWithPreserved;
    expect(out.dsl!.downsample![0]).toEqual({
      after: '41d',
      fixed_interval: '10d',
    });
  });

  it('removes dsl.downsample when there are no steps', () => {
    const internal: DslStepsFlyoutFormInternal = { _meta: { downsampleSteps: [] } };
    const out = serializer(internal) as LifecycleWithPreserved;

    expect(out.dsl!.data_retention).toEqual('30d');
    expect(out.dsl!.downsample).toBeUndefined();
  });

  it('does not create an empty dsl object when initial lifecycle has no dsl and there are no steps', () => {
    const internal: DslStepsFlyoutFormInternal = { _meta: { downsampleSteps: [] } };
    const out = createDslStepsFlyoutSerializer({} as IngestStreamLifecycleDSL)(
      internal
    ) as LifecycleWithPreserved;
    expect(out.dsl).toBeUndefined();
  });

  it('falls back to safe defaults when serializing invalid values (no NaN output)', () => {
    const internal: DslStepsFlyoutFormInternal = {
      _meta: {
        downsampleSteps: [
          {
            afterValue: 'abc',
            afterUnit: 'd',
            afterToMilliSeconds: -1,
            fixedIntervalValue: 'def',
            fixedIntervalUnit: 'h',
          },
        ],
      },
    };

    const out = createDslStepsFlyoutSerializer({ dsl: { data_retention: '30d' } })(
      internal
    ) as LifecycleWithPreserved;

    expect(out.dsl!.downsample![0]).toEqual({ after: '0s', fixed_interval: '1d' });
  });

  it('truncates to MAX_DOWNSAMPLE_STEPS on deserialize and serialize', () => {
    const manySteps = Array.from({ length: MAX_DOWNSAMPLE_STEPS + 2 }, (_, i) => ({
      after: `${i + 1}d`,
      fixed_interval: '1h',
    }));

    const internal = deserializer({
      dsl: { data_retention: '30d', downsample: manySteps },
    });

    expect(internal._meta.downsampleSteps).toHaveLength(MAX_DOWNSAMPLE_STEPS);

    const out = createDslStepsFlyoutSerializer({
      dsl: { data_retention: '30d' },
    })(internal) as LifecycleWithPreserved;

    expect(out.dsl!.downsample).toHaveLength(MAX_DOWNSAMPLE_STEPS);
  });

  it('normalizes numeric formatting of after via Number() cast', () => {
    const internal: DslStepsFlyoutFormInternal = {
      _meta: {
        downsampleSteps: [
          {
            afterValue: '030',
            afterUnit: 'd',
            afterToMilliSeconds: 30 * 86_400_000,
            fixedIntervalValue: '2',
            fixedIntervalUnit: 'h',
          },
        ],
      },
    };

    const out = createDslStepsFlyoutSerializer({ dsl: { data_retention: '30d' } })(
      internal
    ) as LifecycleWithPreserved;

    expect(out.dsl!.downsample![0]).toEqual({ after: '30d', fixed_interval: '2h' });
  });
});
