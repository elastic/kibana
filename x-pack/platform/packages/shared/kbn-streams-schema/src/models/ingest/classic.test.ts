/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClassicStream } from './classic';

describe('ClassicStream', () => {
  describe('Definition', () => {
    it.each([
      {
        name: 'classic-stream',
        description: '',
        ingest: {
          lifecycle: {
            inherit: {},
          },
          processing: {
            steps: [],
          },
          classic: {},
        },
      },
      {
        name: 'classic-stream-with-fields',
        description: '',
        ingest: {
          lifecycle: {
            inherit: {},
          },
          processing: {
            steps: [],
          },
          classic: {
            field_overrides: {
              xxx: {
                type: 'keyword',
              },
            },
          },
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
          lifecycle: {
            inherit: {},
          },
          processing: {
            steps: [],
          },
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
          lifecycle: {
            inherit: {},
          },
          processing: {
            steps: [],
          },
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
            lifecycle: {
              inherit: {},
            },
            processing: { steps: [] },
            classic: {},
          },
        },
        effective_lifecycle: {
          dsl: {},
        },
        privileges: {
          lifecycle: true,
          manage: true,
          monitor: true,
          simulate: true,
          text_structure: true,
        },
        data_stream_exists: true,
        dashboards: [],
        queries: [],
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
            lifecycle: {
              inherit: {},
            },
            processing: {
              steps: [],
            },
            classic: {},
          },
        },
        effective_lifecycle: {
          dsl: {},
        },
        privileges: {
          lifecycle: true,
          manage: true,
          monitor: true,
          simulate: true,
          text_structure: true,
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
        dashboards: [],
        queries: [],
        stream: {
          description: '',
          ingest: {
            lifecycle: {
              inherit: {},
            },
            processing: {
              steps: [],
            },
            classic: {},
          },
        },
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
            lifecycle: {
              inherit: {},
            },
            processing: { steps: [] },
            classic: {},
          },
        },
      },
    ])('is not valid', (val) => {
      expect(ClassicStream.UpsertRequest.is(val as any)).toBe(false);
    });
  });
});
