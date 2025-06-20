/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnwiredStream } from './unwired';

describe('UnwiredStream', () => {
  describe('Definition', () => {
    it.each([
      {
        name: 'unwired-stream',
        description: '',
        ingest: {
          lifecycle: {
            inherit: {},
          },
          processing: [],
          unwired: {},
        },
      },
    ])('is valid', (val) => {
      expect(UnwiredStream.Definition.is(val)).toBe(true);
      expect(UnwiredStream.Definition.right.parse(val)).toEqual(val);
    });

    it.each([
      {
        name: 'unwired-stream',
        description: null,
        ingest: {
          lifecycle: {
            inherit: {},
          },
          processing: [],
          unwired: {},
        },
      },
      {
        name: 'unwired-stream',
        description: '',
        ingest: {
          unwired: {},
        },
      },
      {
        name: 'unwired-stream',
        description: '',
        ingest: {
          lifecycle: {
            inherit: {},
          },
          processing: [],
          unwired: {},
          wired: {},
        },
      },
    ])('is not valid', (val) => {
      expect(UnwiredStream.Definition.is(val as any)).toBe(false);
    });
  });

  describe('GetResponse', () => {
    it.each([
      {
        stream: {
          name: 'unwired-stream',
          description: '',
          ingest: {
            lifecycle: {
              inherit: {},
            },
            processing: [],
            unwired: {},
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
    ] satisfies UnwiredStream.GetResponse[])('is valid', (val) => {
      expect(UnwiredStream.GetResponse.is(val)).toBe(true);
      expect(UnwiredStream.GetResponse.right.parse(val)).toEqual(val);
    });

    it.each([
      {
        stream: {
          description: '',
          ingest: {
            lifecycle: {
              inherit: {},
            },
            processing: [],
            unwired: {},
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
      expect(UnwiredStream.GetResponse.is(val as any)).toBe(false);
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
            processing: [],
            unwired: {},
          },
        },
      },
    ])('is valid', (val) => {
      expect(UnwiredStream.UpsertRequest.is(val)).toBe(true);
      expect(UnwiredStream.UpsertRequest.right.parse(val)).toEqual(val);
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
            processing: [],
            unwired: {},
          },
        },
      },
    ])('is not valid', (val) => {
      expect(UnwiredStream.UpsertRequest.is(val as any)).toBe(false);
    });
  });
});
