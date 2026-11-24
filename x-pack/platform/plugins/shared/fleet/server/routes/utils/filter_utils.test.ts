/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as esKuery from '@kbn/es-query';

import {
  validateFilterKueryNode,
  validateAgentField,
  validateAgentKueryFields,
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

    describe('with many sibling clauses', () => {
      const CLAUSE_COUNT = 10_000;
      // Built with `nodeBuilder` rather than parsed, so KQL parsing time doesn't hide the walker's.
      const siblingClauses = (count: number, fieldName: (index: number) => string) =>
        esKuery.nodeBuilder.or(
          Array.from({ length: count }, (_, index) =>
            esKuery.nodeBuilder.is(fieldName(index), `title-${index}`)
          )
        );

      it('returns one result per clause, in order', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: siblingClauses(CLAUSE_COUNT, () => 'foo.attributes.title'),
          types: ['foo'],
          indexMapping: mockMappings,
          storeValue: true,
        });

        expect(validationObject).toHaveLength(CLAUSE_COUNT);
        expect(validationObject[0]).toEqual({
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.title',
          type: 'foo',
        });
        expect(validationObject[CLAUSE_COUNT - 1].astPath).toBe(`arguments.${CLAUSE_COUNT - 1}`);
        expect(validationObject.every(({ error }) => error === null)).toBe(true);
      });

      it('reports the invalid clause among them at its position', () => {
        const invalidIndex = CLAUSE_COUNT / 2;
        const validationObject = validateFilterKueryNode({
          astFilter: siblingClauses(CLAUSE_COUNT, (index) =>
            index === invalidIndex ? 'foo.attributes.not_a_field' : 'foo.attributes.title'
          ),
          types: ['foo'],
          indexMapping: mockMappings,
          storeValue: true,
        });

        const errors = validationObject.filter(({ error }) => error !== null);
        expect(errors).toEqual([
          expect.objectContaining({
            astPath: `arguments.${invalidIndex}`,
            key: 'foo.attributes.not_a_field',
          }),
        ]);
      });

      it('returns a new array on every call', () => {
        const params = {
          astFilter: esKuery.fromKueryExpression(
            'foo.attributes.title:"a" or (foo.attributes.bytes > 1 and foo.attributes.title:"b")'
          ),
          types: ['foo'],
          indexMapping: mockMappings,
        };

        const first = validateFilterKueryNode(params);
        const second = validateFilterKueryNode(params);

        expect(second).toEqual(first);
        expect(second).not.toBe(first);
        first.pop();
        expect(second).toHaveLength(3);
      });

      it('validates them in linear time', () => {
        // At this size a linear walker takes ~0.2 s locally, while one that copies its results for
        // every clause took ~9 s. The limit leaves headroom for slower CI machines.
        const clauseCount = 100_000;
        const astFilter = siblingClauses(clauseCount, () => 'foo.attributes.title');

        const start = Date.now();
        const validationObject = validateFilterKueryNode({
          astFilter,
          types: ['foo'],
          indexMapping: mockMappings,
          storeValue: true,
        });
        const elapsedMs = Date.now() - start;

        expect(validationObject).toHaveLength(clauseCount);
        expect(elapsedMs).toBeLessThan(2_000);
      });
    });
  });
});

describe('validateAgentField', () => {
  it.each(['default_api_key', 'access_api_key', 'default_api_key.keyword', 'not_a_field', ''])(
    'returns an error for %s',
    (field) => {
      expect(validateAgentField(field)).toBe(`Field '${field}' is not supported`);
    }
  );

  it.each([
    'default_api_key_id',
    'enrolled_at',
    'local_metadata.host.hostname',
    'local_metadata.host.hostname.keyword',
    'status',
    'audit_unenrolled_reason',
    'audit_unenrolled_time',
    'user_provided_metadata',
    'signals',
    'pipeline_config',
  ])('returns undefined for %s', (field) => {
    expect(validateAgentField(field)).toBeUndefined();
  });
});

describe('validateAgentKueryFields', () => {
  it.each([
    'default_api_key:d*',
    'access_api_key:abc',
    'default_api_key > "a"',
    'not_a_field:abc',
    'agent.id:1 and default_api_key:d*',
    'status:online or default_api_key:d*',
    'not default_api_key:d*',
    'default_api*:d*',
    '*api_key:d*',
    '*:d*',
    'local_metadata.host.*:foo',
    'status:online and not (agent.id:1 or *_key:d*)',
    'default_api_key:*',
    'agent.id:1 and default_api_key:*',
    'not access_api_key:*',
    'status:online or not_a_field:*',
    'true:foo',
    'agent.id:1 and true:x',
  ])('returns an error for %s', (kuery) => {
    expect(validateAgentKueryFields(kuery)).toBeDefined();
  });

  it.each([
    'status:online',
    'local_metadata.host.hostname:foo',
    'local_metadata.host.hostname:*foo*',
    'policy_id: *abc*',
    'tags:h*',
    'default_api_key_id:abc',
    'agent.id:1 and tags:x',
    'd*',
    'agent.id:1 and d*',
    'not a valid kuery :',
    undefined,
  ])('returns undefined for %s', (kuery) => {
    expect(validateAgentKueryFields(kuery)).toBeUndefined();
  });

  describe('with one clause per policy, as `buildPolicyIdsOrVariantsKuery` builds it', () => {
    const POLICY_COUNT = 5_000;
    const policyIds = Array.from({ length: POLICY_COUNT }, (_, index) => `policy-${index}`);
    const policiesKuery = `(status:online or status:degraded) and (policy_id:(${policyIds.join(
      ' or '
    )}) or ${policyIds.map((id) => `policy_id:${id}#*`).join(' or ')})`;

    it('accepts it', () => {
      expect(validateAgentKueryFields(policiesKuery)).toBeUndefined();
    });

    it('rejects it when one clause names a field that is not allowed', () => {
      expect(validateAgentKueryFields(`${policiesKuery} or default_api_key:d*`)).toBe(
        "This type 'default_api_key' is not allowed"
      );
    });
  });
});
