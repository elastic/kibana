/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { IlmPolicyPhases } from '@kbn/streams-schema';

import { createMapFormValuesToIlmPolicyPhases, mapIlmPolicyPhasesToFormValues } from './mappers';
import type { IlmPhasesFlyoutFormInternal } from './types';

const unknownValue = { some: 'value' };

describe('streams ILM phases flyout mappers', () => {
  const toFormValues = mapIlmPolicyPhasesToFormValues;

  let phases: IlmPolicyPhases;
  let toPhases: ReturnType<typeof createMapFormValuesToIlmPolicyPhases>;
  let formInternal: IlmPhasesFlyoutFormInternal;

  beforeEach(() => {
    phases = {
      hot: {
        name: 'hot',
        size_in_bytes: 100,
        rollover: { max_age: '1d' },
        readonly: true,
        downsample: {
          after: '0ms',
          fixed_interval: '2d',
          unknown_nested: unknownValue,
        },
        // unknown fields should be preserved
        unknown: unknownValue,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      warm: {
        name: 'warm',
        size_in_bytes: 200,
        min_age: '20d',
        readonly: true,
        downsample: {
          after: '20d',
          fixed_interval: '4d',
          unknown_nested: unknownValue,
        },
        unknown: unknownValue,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      cold: {
        name: 'cold',
        size_in_bytes: 300,
        min_age: '30d',
        readonly: true,
        downsample: {
          after: '30d',
          fixed_interval: '8d',
          unknown_nested: unknownValue,
        },
        searchable_snapshot: 'repo',
        unknown: unknownValue,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      frozen: {
        name: 'frozen',
        size_in_bytes: 0,
        min_age: '40d',
        searchable_snapshot: 'repo',
        unknown: unknownValue,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      delete: {
        name: 'delete',
        min_age: '60d',
        delete_searchable_snapshot: false,
        unknown: unknownValue,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    };

    formInternal = toFormValues(phases);
    // clone here so we can mutate `phases` while the mapper keeps baseline reference semantics
    toPhases = createMapFormValuesToIlmPolicyPhases(cloneDeep(phases));
  });

  it('does not mutate the input phases object', () => {
    const input = cloneDeep(phases);
    const copy = cloneDeep(input);

    toFormValues(input);
    expect(input).toEqual(copy);
  });

  it('preserves unknown properties by mapping onto initialPhases', () => {
    const input = cloneDeep(phases);
    // Assert round trip keeps unknown fields.
    const internal = toFormValues(input);
    const out = createMapFormValuesToIlmPolicyPhases(input)(internal);
    expect(out).toEqual(input);

    // Assert that the baseline object passed to createMapFormValuesToIlmPolicyPhases() is not mutated.
    const copy = cloneDeep(input);
    createMapFormValuesToIlmPolicyPhases(input)(internal);
    expect(input).toEqual(copy);
  });

  it('preserves additional downsample fields when only fixed_interval is edited', () => {
    const internal: IlmPhasesFlyoutFormInternal = cloneDeep(formInternal);

    // Simulate user edit: change warm fixed interval, but we never edit other downsample fields.
    internal._meta.warm.enabled = true;
    internal._meta.warm.downsampleEnabled = true;
    internal._meta.warm.downsample.fixedIntervalValue = '6';
    internal._meta.warm.downsample.fixedIntervalUnit = 'd';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = toPhases(internal) as any;
    expect(out.warm.downsample).toEqual({
      after: '20d',
      fixed_interval: '6d',
      unknown_nested: unknownValue,
    });
  });

  it('removes phases when they are disabled in the form', () => {
    formInternal._meta.warm.enabled = false;
    formInternal._meta.cold.enabled = false;
    formInternal._meta.frozen.enabled = false;
    formInternal._meta.delete.enabled = false;

    expect(toPhases(formInternal)).toEqual({
      hot: phases.hot,
    });
  });

  it('maps empty phases into schema-compatible defaults', () => {
    const internal = toFormValues({});

    expect(internal._meta.hot.enabled).toBe(false);
    expect(internal._meta.hot.downsample).toEqual({
      fixedIntervalValue: '1',
      fixedIntervalUnit: 'd',
    });
    expect(internal._meta.warm.enabled).toBe(false);
    expect(internal._meta.warm.minAgeUnit).toBe('d');
    expect(internal._meta.warm.minAgeValue).toBe('');
    expect(internal._meta.cold.enabled).toBe(false);
    expect(internal._meta.frozen.enabled).toBe(false);
    expect(internal._meta.delete.enabled).toBe(false);
    expect(internal._meta.delete.deleteSearchableSnapshotEnabled).toBe(true);
    expect(internal._meta.searchableSnapshot.repository).toBe('');
  });

  it('defaults delete_searchable_snapshot to true when delete phase omits it', () => {
    const internal = toFormValues({
      delete: { name: 'delete', min_age: '1d' } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });
    expect(internal._meta.delete.deleteSearchableSnapshotEnabled).toBe(true);

    const internal2 = toFormValues({});
    expect(internal2._meta.delete.deleteSearchableSnapshotEnabled).toBe(true);
  });

  it('preserves delete_searchable_snapshot omission when enabled and baseline omitted it', () => {
    const baseline: IlmPolicyPhases = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete: { name: 'delete', min_age: '1d' } as any,
    };

    const internal = toFormValues(baseline);
    expect(internal._meta.delete.deleteSearchableSnapshotEnabled).toBe(true);

    const out = createMapFormValuesToIlmPolicyPhases(cloneDeep(baseline))(internal);
    expect(out).toEqual(baseline);
  });

  it('maps searchable snapshot repository from cold first, then frozen', () => {
    const internal = toFormValues({
      cold: {
        name: 'cold',
        searchable_snapshot: 'coldRepo',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      frozen: {
        name: 'frozen',
        searchable_snapshot: 'frozenRepo',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
    expect(internal._meta.searchableSnapshot.repository).toBe('coldRepo');

    const internal2 = toFormValues({
      frozen: {
        name: 'frozen',
        min_age: '1d',
        searchable_snapshot: 'fRepo',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
    expect(internal2._meta.searchableSnapshot.repository).toBe('fRepo');
  });

  it('parses min_age into value + unit when parsing succeeds', () => {
    const internal = toFormValues({
      warm: { name: 'warm', min_age: '2d' } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });
    expect(internal._meta.warm.minAgeValue).toBe('2');
    expect(internal._meta.warm.minAgeUnit).toBe('d');
  });

  it('round-trips preserved units like ms for min_age and downsample fixed_interval', () => {
    const input: IlmPolicyPhases = {
      hot: { name: 'hot', size_in_bytes: 0, rollover: {} },
      warm: {
        name: 'warm',
        size_in_bytes: 0,
        min_age: '1500ms',
        downsample: {
          after: '1500ms',
          fixed_interval: '1500ms',
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const internal = toFormValues(input);
    expect(internal._meta.warm.minAgeValue).toBe('1500');
    expect(internal._meta.warm.minAgeUnit).toBe('ms');
    expect(internal._meta.warm.downsample.fixedIntervalValue).toBe('1500');
    expect(internal._meta.warm.downsample.fixedIntervalUnit).toBe('ms');

    const out = createMapFormValuesToIlmPolicyPhases(cloneDeep(input))(internal);
    expect(out).toEqual(input);
  });

  it('maps searchable_snapshot for cold only when enabled; frozen always when enabled', () => {
    const internal: IlmPhasesFlyoutFormInternal = cloneDeep(formInternal);
    internal._meta.searchableSnapshot.repository = 'repo1';

    internal._meta.cold.searchableSnapshotEnabled = false;
    internal._meta.frozen.enabled = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = toPhases(internal) as any;
    expect(out.cold.searchable_snapshot).toBeUndefined();
    expect(out.frozen.searchable_snapshot).toEqual('repo1');

    internal._meta.cold.searchableSnapshotEnabled = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out2 = toPhases(internal) as any;
    expect(out2.cold.searchable_snapshot).toEqual('repo1');
    expect(out2.frozen.searchable_snapshot).toEqual('repo1');
  });
});
