/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicyForFlyout } from '@kbn/data-lifecycle-phases';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import type { EffectiveFailureStore, IngestStreamEffectiveLifecycle } from '@kbn/streams-schema';
import {
  IMPORT_METHOD_DLM,
  IMPORT_METHOD_ILM,
} from '../data_phases/import_lifecycle_flyout/constants';
import { buildImportRetentionOptions } from './build_retention_options';

const makeStream = (
  name: string,
  effectiveLifecycle?: IngestStreamEffectiveLifecycle,
  effectiveFailureStore?: EffectiveFailureStore,
  readFailureStore = true
): ListStreamDetail =>
  ({
    stream: { name },
    effective_lifecycle: effectiveLifecycle,
    effective_failure_store: effectiveFailureStore,
    privileges: { read_failure_store: readFailureStore },
  } as unknown as ListStreamDetail);

describe('buildImportRetentionOptions', () => {
  it('excludes the current stream', () => {
    const options = buildImportRetentionOptions({
      streams: [
        makeStream('current', { dsl: { data_retention: '30d' } }),
        makeStream('other', { dsl: { data_retention: '30d' } }),
      ],
      currentStreamName: 'current',
      ilmPoliciesByName: new Map(),
      isServerless: false,
    });

    expect(options.map((o) => o.name)).toEqual(['other']);
  });

  it('excludes streams without a resolvable lifecycle', () => {
    const options = buildImportRetentionOptions({
      streams: [
        makeStream('no-lifecycle'),
        makeStream('errored', { error: { message: 'boom' } }),
        makeStream('disabled', { disabled: {} }),
        makeStream('ok', { dsl: { data_retention: '30d' } }),
      ],
      currentStreamName: 'current',
      ilmPoliciesByName: new Map(),
      isServerless: false,
    });

    expect(options.map((o) => o.name)).toEqual(['ok']);
  });

  it('builds a DSL option with retention, phases, and downsampling summary', () => {
    const options = buildImportRetentionOptions({
      streams: [
        makeStream('dsl-stream', {
          dsl: {
            data_retention: '30d',
            frozen_after: '7d',
            downsample: [{ after: '1d', fixed_interval: '1h' }],
          },
        }),
      ],
      currentStreamName: 'current',
      ilmPoliciesByName: new Map(),
      isServerless: false,
    });

    expect(options).toEqual([
      {
        name: 'dsl-stream',
        method: IMPORT_METHOD_DLM,
        descriptionCategory: 'Success',
        descriptionParts: ['30d', '3 phases', '1 downsample'],
        hasDownsampling: true,
      },
    ]);
  });

  it('excludes the frozen phase from the count on serverless', () => {
    const [option] = buildImportRetentionOptions({
      streams: [
        makeStream('dsl-stream', {
          dsl: { data_retention: '30d', frozen_after: '7d' },
        }),
      ],
      currentStreamName: 'current',
      ilmPoliciesByName: new Map(),
      isServerless: true,
    });

    expect(option.descriptionParts).toEqual(['30d', '2 phases']);
  });

  it('marks an indefinite DSL stream with a single hot phase', () => {
    const [option] = buildImportRetentionOptions({
      streams: [makeStream('dsl-stream', { dsl: {} })],
      currentStreamName: 'current',
      ilmPoliciesByName: new Map(),
      isServerless: false,
    });

    expect(option.descriptionParts).toEqual(['∞', '1 phase']);
  });

  it('builds an ILM option with a badge and inspect affordance from policy stats', () => {
    const policy: IlmPolicyForFlyout = {
      name: 'my-policy',
      phases: {
        hot: { actions: { downsample: { fixed_interval: '1h' } } },
        delete: { min_age: '60d', actions: { delete: {} } },
      },
      serializedPolicy: { name: 'my-policy', phases: {} },
    };

    const [option] = buildImportRetentionOptions({
      streams: [makeStream('ilm-stream', { ilm: { policy: 'my-policy' } })],
      currentStreamName: 'current',
      ilmPoliciesByName: new Map([[policy.name, policy]]),
      isServerless: false,
    });

    expect(option).toEqual({
      name: 'ilm-stream',
      method: IMPORT_METHOD_ILM,
      descriptionCategory: 'Success',
      descriptionParts: ['60d', '2 phases', '1 downsample'],
      badge: 'ILM',
      inspectable: true,
      hasDownsampling: true,
    });
  });

  it('falls back to the policy name when policy details are unavailable', () => {
    const [option] = buildImportRetentionOptions({
      streams: [makeStream('ilm-stream', { ilm: { policy: 'my-policy' } })],
      currentStreamName: 'current',
      ilmPoliciesByName: new Map(),
      isServerless: false,
    });

    expect(option).toEqual({
      name: 'ilm-stream',
      method: IMPORT_METHOD_ILM,
      descriptionCategory: 'Success',
      descriptionParts: ['my-policy'],
      badge: 'ILM',
    });
  });

  it('sorts options by stream name', () => {
    const options = buildImportRetentionOptions({
      streams: [
        makeStream('zeta', { dsl: {} }),
        makeStream('alpha', { dsl: {} }),
        makeStream('mid', { dsl: {} }),
      ],
      currentStreamName: 'current',
      ilmPoliciesByName: new Map(),
      isServerless: false,
    });

    expect(options.map((o) => o.name)).toEqual(['alpha', 'mid', 'zeta']);
  });

  describe('failure store second line', () => {
    it('omits the Fail line when the failure store is disabled', () => {
      const [option] = buildImportRetentionOptions({
        streams: [makeStream('dsl-stream', { dsl: { data_retention: '30d' } }, { disabled: {} })],
        currentStreamName: 'current',
        ilmPoliciesByName: new Map(),
        isServerless: false,
      });

      expect(option.descriptionCategorySecondLine).toBeUndefined();
      expect(option.descriptionPartsSecondLine).toBeUndefined();
    });

    it('shows a single hot phase when the failure store has no retention configured', () => {
      const [option] = buildImportRetentionOptions({
        streams: [
          makeStream(
            'dsl-stream',
            { dsl: { data_retention: '30d' } },
            { lifecycle: { disabled: {} } }
          ),
        ],
        currentStreamName: 'current',
        ilmPoliciesByName: new Map(),
        isServerless: false,
      });

      expect(option.descriptionCategorySecondLine).toBe('Fail');
      expect(option.descriptionPartsSecondLine).toEqual(['∞', '1 phase']);
    });

    it('shows a hot + delete phase when the failure store has a retention period', () => {
      const [option] = buildImportRetentionOptions({
        streams: [
          makeStream(
            'dsl-stream',
            { dsl: { data_retention: '30d' } },
            {
              lifecycle: { enabled: { data_retention: '60d', is_default_retention: false } },
            }
          ),
        ],
        currentStreamName: 'current',
        ilmPoliciesByName: new Map(),
        isServerless: false,
      });

      expect(option.descriptionCategorySecondLine).toBe('Fail');
      expect(option.descriptionPartsSecondLine).toEqual(['60d', '2 phases']);
    });

    it('excludes streams when the source failure store cannot be read', () => {
      const options = buildImportRetentionOptions({
        streams: [
          makeStream(
            'dsl-stream',
            { dsl: { data_retention: '30d' } },
            {
              lifecycle: { enabled: { data_retention: '60d', is_default_retention: false } },
            },
            false
          ),
        ],
        currentStreamName: 'current',
        ilmPoliciesByName: new Map(),
        isServerless: false,
      });

      expect(options).toEqual([]);
    });
  });
});
