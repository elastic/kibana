/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GroupStream } from '.';

describe('GroupStream', () => {
  describe('Definition', () => {
    it.each([
      {
        name: 'group-stream',
        description: '',
        group: {
          metadata: {},
          tags: [],
          members: [],
        },
      },
    ])('is valid', (val) => {
      expect(GroupStream.Definition.is(val)).toBe(true);
      expect(GroupStream.Definition.right.parse(val)).toEqual(val);
    });

    it.each([
      {
        name: 'group-stream',
        description: null,
        group: {
          members: [],
        },
      },
      {
        name: 'group-stream',
        description: '',
        group: {},
      },
      {
        name: 'group-stream',
        description: '',
        group: {
          members: 'logs',
        },
      },
    ])('is not valid', (val) => {
      expect(() => GroupStream.Definition.asserts(val as any)).toThrow();
    });
  });

  describe('GetResponse', () => {
    it.each([
      {
        stream: {
          name: 'group-stream',
          description: '',
          group: {
            metadata: {},
            tags: [],
            members: [],
          },
        },
        dashboards: [],
        queries: [],
        rules: [],
      },
    ])('is valid', (val) => {
      expect(GroupStream.GetResponse.is(val)).toBe(true);
      expect(GroupStream.GetResponse.right.parse(val)).toEqual(val);
    });

    it.each([
      {
        stream: {
          description: '',
          group: {
            members: [],
          },
        },
        dashboards: [],
        queries: [],
      },
      {
        stream: {
          description: '',
          group: {
            members: [],
          },
        },
        dashboards: [],
      },
      {
        stream: {
          description: '',
          group: {
            members: [],
          },
        },
        queries: [],
      },
    ])('is not valid', (val) => {
      expect(GroupStream.GetResponse.is(val as any)).toBe(false);
    });
  });

  describe('UpsertRequest', () => {
    it.each([
      {
        dashboards: [],
        queries: [],
        rules: [],
        stream: {
          description: '',
          group: {
            metadata: {},
            tags: [],
            members: [],
          },
        },
      },
    ])('is valid', (val) => {
      expect(GroupStream.UpsertRequest.is(val)).toBe(true);
      expect(GroupStream.UpsertRequest.right.parse(val)).toEqual(val);
    });

    it.each([
      {
        dashboards: [],
        queries: [],
        stream: {
          group: {
            members: [],
          },
        },
      },
      {
        dashboards: [],
        queries: [],
        stream: {
          description: '',
        },
      },
      {
        dashboards: [],
        queries: [],
        stream: {
          name: 'my-name',
          description: '',
          group: {
            members: [],
          },
        },
      },
    ])('is not valid', (val) => {
      expect(GroupStream.UpsertRequest.is(val as any)).toBe(false);
    });
  });
});
