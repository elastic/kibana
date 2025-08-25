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
          owner: 'test_user',
          tier: 1,
          metadata: {},
          tags: [],
          documentation_links: [],
          repository_links: [],
          runbook_links: [],
          relationships: [],
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
          relationships: [],
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
          relationships: 'logs',
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
            owner: 'test_user',
            tier: 1,
            metadata: {},
            tags: [],
            documentation_links: [],
            repository_links: [],
            runbook_links: [],
            relationships: [],
          },
        },
        dashboards: [],
        queries: [],
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
            relationships: [],
          },
        },
        dashboards: [],
        queries: [],
      },
      {
        stream: {
          description: '',
          group: {
            relationships: [],
          },
        },
        dashboards: [],
      },
      {
        stream: {
          description: '',
          group: {
            relationships: [],
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
        stream: {
          description: '',
          group: {
            owner: 'test_user',
            tier: 1,
            metadata: {},
            tags: [],
            documentation_links: [],
            repository_links: [],
            runbook_links: [],
            relationships: [],
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
            relationships: [],
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
            relationships: [],
          },
        },
      },
    ])('is not valid', (val) => {
      expect(GroupStream.UpsertRequest.is(val as any)).toBe(false);
    });
  });
});
