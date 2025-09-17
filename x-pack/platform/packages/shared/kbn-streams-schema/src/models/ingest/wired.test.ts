/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { emptyAssets } from '../../helpers/empty_assets';
import { WiredStream } from './wired';

describe('WiredStream', () => {
  describe('Definition', () => {
    it.each([
      {
        name: 'wired-stream',
        description: '',
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [] },
          settings: {},
          wired: {
            fields: {},
            routing: [],
          },
        },
      },
    ] satisfies WiredStream.Definition[])('is valid %s', (val) => {
      expect(WiredStream.Definition.is(val)).toBe(true);
      expect(WiredStream.Definition.right.parse(val)).toEqual(val);
    });

    it.each([
      {
        name: 'wired-stream',
        description: null,
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [] },
          settings: {},
          wired: {
            fields: {},
            routing: [],
          },
        },
      },
      {
        name: 'wired-stream',
        description: '',
        ingest: {
          settings: {},
          wired: {
            fields: {},
            routing: [],
          },
        },
      },
      {
        name: 'wired-stream',
        description: '',
        ingest: {
          lifecycle: { inherit: {} },
          settings: {},
          processing: { steps: [] },
          classic: {},
          wired: {
            fields: {},
            routing: [],
          },
        },
      },
    ])('is not valid %s', (val) => {
      expect(() => WiredStream.Definition.asserts(val as any)).toThrow();
    });
  });

  describe('GetResponse', () => {
    it.each([
      {
        stream: {
          name: 'wired-stream',
          description: '',
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [] },
            settings: {},
            wired: {
              fields: {},
              routing: [],
            },
          },
        },
        privileges: {
          lifecycle: true,
          manage: true,
          monitor: true,
          simulate: true,
          text_structure: true,
        },
        effective_lifecycle: {
          dsl: {},
          from: 'logs',
        },
        effective_settings: {},
        inherited_fields: {},
        ...emptyAssets,
      },
    ] satisfies WiredStream.GetResponse[])('is valid %s', (val) => {
      expect(WiredStream.GetResponse.is(val)).toBe(true);
      expect(WiredStream.GetResponse.right.parse(val)).toEqual(val);
    });

    it.each([
      {
        stream: {
          description: '',
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [] },
            settings: {},
            wired: {
              fields: {},
              routing: [],
            },
          },
        },
        effective_lifecycle: {
          dsl: {},
          from: 'logs',
        },
        effective_settings: {},
        inherited_fields: {},
        privileges: {
          lifecycle: true,
          manage: true,
          monitor: true,
          simulate: true,
          text_structure: true,
        },
        dashboards: [],
        queries: [],
      },
    ])('is not valid', (val) => {
      expect(WiredStream.GetResponse.is(val as any)).toBe(false);
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
            wired: {
              fields: {},
              routing: [],
            },
          },
        },
        ...emptyAssets,
      },
    ])('is valid', (val) => {
      expect(WiredStream.UpsertRequest.is(val)).toBe(true);
      expect(WiredStream.UpsertRequest.right.parse(val)).toEqual(val);
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
            wired: {
              fields: {},
              routing: [],
            },
          },
        },
      },
    ])('is not valid', (val) => {
      expect(WiredStream.UpsertRequest.is(val as any)).toBe(false);
    });
  });
});
