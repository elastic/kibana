/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { emptyAssets } from '../../helpers/empty_assets';
import { ClassicStream } from './classic';

describe('ClassicStream', () => {
  describe('Definition', () => {
    it.each([
      {
        name: 'classic-stream',
        description: '',
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [] },
          settings: {},
          classic: {},
          failure_store: { inherit: {} },
        },
      },
      {
        name: 'classic-stream-with-fields',
        description: '',
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [] },
          settings: {},
          classic: {
            field_overrides: {
              xxx: {
                type: 'keyword',
              },
            },
          },
          failure_store: { inherit: {} },
        },
      },
    ])('is valid', (val) => {
      expect(ClassicStream.Definition.asserts(val)).toBe(true);
      expect(ClassicStream.Definition.right.parse(val)).toEqual(val);
    });

    it.each([
      {
        name: 'classic-stream',
        description: null,
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [] },
          settings: {},
          classic: {},
        },
      },
      {
        name: 'classic-stream',
        description: '',
        ingest: {
          classic: {},
        },
      },
      {
        name: 'classic-stream',
        description: '',
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [] },
          settings: {},
          classic: {},
          wired: {},
        },
      },
    ])('is not valid', (val) => {
      expect(() => ClassicStream.Definition.asserts(val as any)).toThrow();
    });
  });

  describe('GetResponse', () => {
    it.each([
      {
        stream: {
          name: 'classic-stream',
          description: '',
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [] },
            settings: {},
            classic: {},
            failure_store: { inherit: {} },
          },
        },
        effective_lifecycle: {
          dsl: {},
        },
        effective_settings: {},
        privileges: {
          lifecycle: true,
          manage: true,
          monitor: true,
          simulate: true,
          text_structure: true,
          read_failure_store: true,
          manage_failure_store: true,
          view_index_metadata: true,
        },
        data_stream_exists: true,
        effective_failure_store: {
          lifecycle: {
            data_retention: undefined,
          },
        },
        ...emptyAssets,
      },
    ] satisfies ClassicStream.GetResponse[])('is valid', (val) => {
      expect(ClassicStream.GetResponse.is(val)).toBe(true);
      expect(ClassicStream.GetResponse.right.parse(val)).toEqual(val);
    });

    it.each([
      {
        stream: {
          description: '',
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [] },
            settings: {},
            classic: {},
          },
        },
        effective_lifecycle: {
          dsl: {},
        },
        effective_settings: {},
        privileges: {
          lifecycle: true,
          manage: true,
          monitor: true,
          simulate: true,
          text_structure: true,
          failure_store: true,
          view_index_metadata: true,
        },
        data_stream_exists: true,
        dashboards: [],
        queries: [],
      },
    ])('is not valid', (val) => {
      expect(ClassicStream.GetResponse.is(val as any)).toBe(false);
    });
  });

  describe('UpsertRequest', () => {
    it.each([
      {
        stream: {
          description: '',
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [] },
            settings: {},
            classic: {},
            failure_store: { inherit: {} },
          },
        },
        ...emptyAssets,
      },
    ])('is valid', (val) => {
      expect(ClassicStream.UpsertRequest.is(val)).toBe(true);
      expect(ClassicStream.UpsertRequest.right.parse(val)).toEqual(val);
    });

    it.each([
      {
        dashboards: [],
        queries: [],
        stream: {
          name: 'my-name',
          description: '',
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [] },
            settings: {},
            classic: {},
          },
        },
      },
    ])('is not valid', (val) => {
      expect(ClassicStream.UpsertRequest.is(val as any)).toBe(false);
    });
  });
});
