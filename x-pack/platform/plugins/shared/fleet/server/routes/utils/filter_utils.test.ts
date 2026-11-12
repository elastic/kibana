/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as esKuery from '@kbn/es-query';

import {
  validateFilterKueryNode,
  isAgentFieldNotInMappings,
  findUnmappedAgentFieldInKuery,
} from './filter_utils';

const mockMappings = {
  properties: {
    updated_at: {
      type: 'date',
    },
    foo: {
      properties: {
        title: {
          type: 'text',
        },
        description: {
          type: 'text',
        },
        bytes: {
          type: 'integer',
        },
      },
    },
    bar: {
      properties: {
        _id: {
          type: 'keyword',
        },
        foo: {
          type: 'text',
        },
        description: {
          type: 'text',
        },
      },
    },
    bean: {
      properties: {
        canned: {
          fields: {
            text: {
              type: 'text',
            },
          },
          type: 'keyword',
        },
      },
    },
    alert: {
      properties: {
        actions: {
          type: 'nested',
          properties: {
            group: {
              type: 'keyword',
            },
            actionRef: {
              type: 'keyword',
            },
            actionTypeId: {
              type: 'keyword',
            },
            params: {
              enabled: false,
              type: 'object',
            },
          },
        },
        params: {
          type: 'flattened',
        },
      },
    },
    hiddenType: {
      properties: {
        description: {
          type: 'text',
        },
      },
    },
  },
} as const;

describe('Filter Utils', () => {
  describe('ValidateFilterKueryNode', () => {
    describe('Validate general kueries through KueryNode', () => {
      it('Simple filter', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'foo.updated_at: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
          ),
          types: ['foo'],
          indexMapping: mockMappings,
        });

        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: null,
            isSavedObjectAttr: true,
            key: 'foo.updated_at',
            type: 'foo',
          },
          {
            astPath: 'arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.2',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.3',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.title',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.0',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
        ]);
      });

      it('Nested filter query', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'alert.attributes.actions:{ actionTypeId: ".server-log" }'
          ),
          types: ['alert'],
          indexMapping: mockMappings,
          hasNestedKey: true,
        });
        expect(validationObject).toEqual([
          {
            astPath: 'arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'alert.attributes.actions.actionTypeId',
            type: 'alert',
          },
        ]);
      });

      it('Accept defined key even if not wrapped by a saved object type', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'updated_at: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
          ),
          types: ['foo'],
          indexMapping: mockMappings,
        });

        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: null,
            isSavedObjectAttr: true,
            key: 'updated_at',
            type: null,
          },
          {
            astPath: 'arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.2',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.3',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.title',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.0',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
        ]);
      });

      it('Return Error if key of a saved object type is not wrapped with attributes', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'foo.updated_at: 5678654567 and foo.attributes.bytes > 1000 and foo.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.description :*)'
          ),
          types: ['foo'],
          indexMapping: mockMappings,
        });

        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: null,
            isSavedObjectAttr: true,
            key: 'foo.updated_at',
            type: 'foo',
          },
          {
            astPath: 'arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.2',
            error:
              "This key 'foo.bytes' does NOT match the filter proposition SavedObjectType.attributes.key",
            isSavedObjectAttr: false,
            key: 'foo.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.3',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.title',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.0',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.1',
            error:
              "This key 'foo.description' does NOT match the filter proposition SavedObjectType.attributes.key",
            isSavedObjectAttr: false,
            key: 'foo.description',
            type: 'foo',
          },
        ]);
      });

      it('Return Error if filter is not using an allowed type', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'bar.updated_at: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
          ),
          types: ['foo'],
          indexMapping: mockMappings,
        });

        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: `This key 'bar.updated_at' does NOT exist in foo saved object index patterns`,
            isSavedObjectAttr: true,
            key: 'bar.updated_at',
            type: 'bar',
          },
          {
            astPath: 'arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.2',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.3',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.title',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.0',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
        ]);
      });

      it('Return Error if filter is using an non-existing key in the index patterns of the saved object type', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'foo.updated_at33: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.header: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
          ),
          types: ['foo'],
          indexMapping: mockMappings,
        });

        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: "This key 'foo.updated_at33' does NOT exist in foo saved object index patterns",
            isSavedObjectAttr: false,
            key: 'foo.updated_at33',
            type: 'foo',
          },
          {
            astPath: 'arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.2',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.3',
            error:
              "This key 'foo.attributes.header' does NOT exist in foo saved object index patterns",
            isSavedObjectAttr: false,
            key: 'foo.attributes.header',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.0',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
        ]);
      });

      it('Not return error if filter is using an non-existing key null key', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression('foo.attributes.description: hello AND bye'),
          types: ['foo'],
          indexMapping: mockMappings,
        });

        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
          {
            astPath: 'arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: null,
            type: null,
          },
        ]);
      });

      it('Multiple nested filter queries', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'alert.attributes.actions:{ actionTypeId: ".server-log" AND actionRef: "foo" }'
          ),
          types: ['alert'],
          indexMapping: mockMappings,
        });

        expect(validationObject).toEqual([
          {
            astPath: 'arguments.1.arguments.0',
            error: null,
            isSavedObjectAttr: false,
            key: 'alert.attributes.actions.actionTypeId',
            type: 'alert',
          },
          {
            astPath: 'arguments.1.arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'alert.attributes.actions.actionRef',
            type: 'alert',
          },
        ]);
      });
    });
  });
});

describe('isAgentFieldNotInMappings', () => {
  it.each(['default_api_key', 'access_api_key', 'default_api_key.keyword'])(
    'returns true for %s',
    (field) => {
      expect(isAgentFieldNotInMappings(field)).toBe(true);
    }
  );

  it.each(['default_api_key_id', 'enrolled_at', 'local_metadata.host.hostname', '', undefined])(
    'returns false for %s',
    (field) => {
      expect(isAgentFieldNotInMappings(field)).toBe(false);
    }
  );
});

describe('findUnmappedAgentFieldInKuery', () => {
  it.each([
    'default_api_key:d*',
    'access_api_key:abc',
    'agent.id:1 and default_api_key:d*',
    'status:online or default_api_key:d*',
    'not default_api_key:d*',
  ])('finds the non-queryable field in %s', (kuery) => {
    expect(findUnmappedAgentFieldInKuery(kuery)).toMatch(/api_key/);
  });

  it.each([
    ['default_api*:d*', 'default_api*'],
    ['*api_key:d*', '*api_key'],
    ['*:d*', '*'],
    ['local_metadata.host.*:foo', 'local_metadata.host.*'],
    ['status:online and not (agent.id:1 or *_key:d*)', '*_key'],
  ])('finds the wildcard field name in %s', (kuery, expected) => {
    expect(findUnmappedAgentFieldInKuery(kuery)).toBe(expected);
  });

  it.each(['local_metadata.host.hostname:*foo*', 'policy_id: *abc*', 'tags:h*'])(
    'allows a wildcard value on a named field (%s)',
    (kuery) => {
      expect(findUnmappedAgentFieldInKuery(kuery)).toBeUndefined();
    }
  );

  it.each([
    'status:online',
    'local_metadata.host.hostname:foo',
    'default_api_key_id:abc',
    'agent.id:1 and tags:x',
    'd*',
    'agent.id:1 and d*',
    undefined,
  ])('returns undefined for %s (no named credential field)', (kuery) => {
    expect(findUnmappedAgentFieldInKuery(kuery)).toBeUndefined();
  });
});
