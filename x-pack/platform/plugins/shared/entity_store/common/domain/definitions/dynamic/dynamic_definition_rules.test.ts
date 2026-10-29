/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { Condition } from '@kbn/streamlang';
import type { DynamicBlock } from './dynamic_block_schema';
import { isNotEmptyCondition } from '../common_fields';
import {
  MAX_DYNAMIC_IDENTITY_FIELDS,
  NO_IDENTITY_ATTRIBUTE_RULE,
  RESERVED_LAST_SEEN_FIELD,
  SERVABLE_IDENTITY_RULE,
  getPresenceFilter,
} from './dynamic_definition_rules';
import {
  entitySchema,
  type CalculatedEntityIdentity,
  type EntityDefinitionWithoutId,
  type EntityIdentity,
} from '../entity_schema';
import { buildUserEntityDefinition } from '../user';
import { hostEntityDefinition } from '../host';

const dynamic: DynamicBlock = {
  sources: [
    {
      indexPattern: 'metrics-system.*',
      attributes: [{ name: 'os_name', field: 'host.os.name' }],
    },
  ],
};

const definition = (
  identityField: EntityIdentity,
  overrides: Partial<EntityDefinitionWithoutId> = {}
) => ({
  id: 'test-default',
  type: 'test',
  name: 'Test',
  identityField,
  dynamic,
  ...overrides,
});

const issuesOf = (value: unknown) => entitySchema.safeParse(value).error?.issues ?? [];

const expectAccepted = (value: unknown) => {
  expect(issuesOf(value)).toEqual([]);
};

const expectRejected = (value: unknown, path: PropertyKey[], rule: string) => {
  const issues = issuesOf(value);
  expect(issues.map((issue) => issue.path)).toEqual([path]);
  expect(issues[0].message).toContain(`${rule}:`);
};

/** A one-branch ranking of single-field compositions with its exact presence filter. */
const ranked = (fields: string[]): CalculatedEntityIdentity => ({
  euidRanking: { branches: [{ ranking: fields.map((field) => [{ field }]) }] },
  documentsFilter: getPresenceFilter(fields.map((field) => [field])),
});

const hostIdentity = ranked(['host.id', 'host.name', 'host.hostname']);

describe('dynamic definition rules', () => {
  describe('servable identity', () => {
    describe('single field', () => {
      it('accepts a literal field', () => {
        expectAccepted(definition({ singleField: 'k8s.pod.uid' }));
      });

      it('rejects skipTypePrepend', () => {
        expectRejected(
          definition({ singleField: 'k8s.pod.uid', skipTypePrepend: true }),
          ['identityField', 'skipTypePrepend'],
          SERVABLE_IDENTITY_RULE
        );
      });

      it('accepts skipTypePrepend: false', () => {
        expectAccepted(definition({ singleField: 'k8s.pod.uid', skipTypePrepend: false }));
      });

      it('rejects the reserved last_seen field', () => {
        expectRejected(
          definition({ singleField: RESERVED_LAST_SEEN_FIELD }),
          ['identityField', 'singleField'],
          SERVABLE_IDENTITY_RULE
        );
        expect(issuesOf(definition({ singleField: 'last_seen' }))[0].message).toContain(
          '"last_seen" is the inventory\'s own output column'
        );
      });

      it('accepts entity.id and a field merely containing last_seen', () => {
        expectAccepted(definition({ singleField: 'entity.id' }));
        expectAccepted(definition({ singleField: 'host.last_seen' }));
      });

      it.each(['k8s.pod.*', 'TO_LOWER(k8s.pod.uid)', 'k8s pod'])(
        'rejects the non-literal field %p',
        (singleField) => {
          expectRejected(
            definition({ singleField }),
            ['identityField', 'singleField'],
            SERVABLE_IDENTITY_RULE
          );
        }
      );
    });

    describe('calculated identity', () => {
      it('accepts the exact derived presence filter', () => {
        expectAccepted(definition(hostIdentity));
      });

      it('accepts a single composition of several fields and separators with its and-filter', () => {
        expectAccepted(
          definition({
            euidRanking: {
              branches: [
                {
                  ranking: [
                    [
                      { field: 'k8s.namespace.name' },
                      { sep: '/' },
                      { field: 'k8s.deployment.name' },
                    ],
                  ],
                },
              ],
            },
            documentsFilter: {
              and: [
                isNotEmptyCondition('k8s.namespace.name'),
                isNotEmptyCondition('k8s.deployment.name'),
              ],
            },
          })
        );
      });

      it('accepts a single one-field composition with that field presence condition', () => {
        expectAccepted(
          definition({
            euidRanking: { branches: [{ ranking: [[{ field: 'k8s.pod.uid' }]] }] },
            documentsFilter: isNotEmptyCondition('k8s.pod.uid'),
          })
        );
      });

      it('rejects skipTypePrepend', () => {
        expectRejected(
          definition({ ...hostIdentity, skipTypePrepend: true }),
          ['identityField', 'skipTypePrepend'],
          SERVABLE_IDENTITY_RULE
        );
      });

      it('rejects fieldEvaluations', () => {
        expectRejected(
          definition({
            ...hostIdentity,
            fieldEvaluations: [
              {
                destination: 'entity.namespace',
                sources: [{ field: 'event.module' }],
                fallbackValue: null,
                whenClauses: [],
              },
            ],
          }),
          ['identityField', 'fieldEvaluations'],
          SERVABLE_IDENTITY_RULE
        );
      });

      it('accepts an empty fieldEvaluations list', () => {
        expectAccepted(definition({ ...hostIdentity, fieldEvaluations: [] }));
      });

      it('rejects two branches', () => {
        const [branch] = hostIdentity.euidRanking.branches;
        expectRejected(
          definition({ ...hostIdentity, euidRanking: { branches: [branch, branch] } }),
          ['identityField', 'euidRanking', 'branches'],
          SERVABLE_IDENTITY_RULE
        );
      });

      it('rejects a when on the branch', () => {
        const [branch] = hostIdentity.euidRanking.branches;
        expectRejected(
          definition({
            ...hostIdentity,
            euidRanking: { branches: [{ ...branch, when: { field: 'host.id', exists: true } }] },
          }),
          ['identityField', 'euidRanking', 'branches', 0, 'when'],
          SERVABLE_IDENTITY_RULE
        );
      });

      it('rejects a composition with a non-literal field', () => {
        expectRejected(
          definition({
            euidRanking: {
              branches: [{ ranking: [[{ field: 'host.id' }], [{ field: 'host.*' }]] }],
            },
            documentsFilter: getPresenceFilter([['host.id'], ['host.*']]),
          }),
          ['identityField', 'euidRanking', 'branches', 0, 'ranking', 1, 0, 'field'],
          SERVABLE_IDENTITY_RULE
        );
      });

      it('rejects the reserved last_seen field in a ranking composition', () => {
        expectRejected(
          definition(ranked(['host.id', RESERVED_LAST_SEEN_FIELD])),
          ['identityField', 'euidRanking', 'branches', 0, 'ranking', 1, 0, 'field'],
          SERVABLE_IDENTITY_RULE
        );
      });

      it('accepts entity.id as a ranking field', () => {
        expectAccepted(definition(ranked(['entity.id', 'host.name'])));
      });

      it(`accepts ${MAX_DYNAMIC_IDENTITY_FIELDS} distinct fields`, () => {
        const fields = Array.from({ length: MAX_DYNAMIC_IDENTITY_FIELDS }, (_, i) => `f${i}.id`);
        expectAccepted(definition(ranked(fields)));
      });

      it('counts a field referenced by several compositions once', () => {
        // 7 compositions of two fields each: 14 references, 8 distinct fields.
        const compositions = Array.from({ length: MAX_DYNAMIC_IDENTITY_FIELDS - 1 }, (_, i) => [
          `f${i + 1}.id`,
          'f0.id',
        ]);
        expectAccepted(
          definition({
            euidRanking: {
              branches: [
                {
                  ranking: compositions.map(([first, second]) => [
                    { field: first },
                    { sep: '-' },
                    { field: second },
                  ]),
                },
              ],
            },
            documentsFilter: getPresenceFilter(compositions),
          })
        );
      });

      it(`rejects ${MAX_DYNAMIC_IDENTITY_FIELDS + 1} distinct fields`, () => {
        const fields = Array.from(
          { length: MAX_DYNAMIC_IDENTITY_FIELDS + 1 },
          (_, i) => `f${i}.id`
        );
        expectRejected(
          definition(ranked(fields)),
          ['identityField', 'euidRanking'],
          SERVABLE_IDENTITY_RULE
        );
      });

      it('rejects a documentsFilter missing a field', () => {
        expectRejected(
          definition({
            ...hostIdentity,
            documentsFilter: {
              or: [isNotEmptyCondition('host.id'), isNotEmptyCondition('host.name')],
            },
          }),
          ['identityField', 'documentsFilter'],
          SERVABLE_IDENTITY_RULE
        );
      });

      it('rejects a documentsFilter with an extra condition', () => {
        expectRejected(
          definition({
            ...hostIdentity,
            documentsFilter: {
              and: [
                hostIdentity.documentsFilter,
                { field: 'event.outcome', neq: 'failure' } as Condition,
              ],
            },
          }),
          ['identityField', 'documentsFilter'],
          SERVABLE_IDENTITY_RULE
        );
      });

      it('rejects an equivalent documentsFilter in a different order (the comparison is exact)', () => {
        expectRejected(
          definition({
            ...hostIdentity,
            documentsFilter: {
              or: [
                isNotEmptyCondition('host.hostname'),
                isNotEmptyCondition('host.name'),
                isNotEmptyCondition('host.id'),
              ],
            },
          }),
          ['identityField', 'documentsFilter'],
          SERVABLE_IDENTITY_RULE
        );
      });
    });

    it('accepts the Security host identity', () => {
      expectAccepted(definition(hostEntityDefinition.identityField));
    });

    it('rejects the Security user identity', () => {
      const issues = issuesOf(definition(buildUserEntityDefinition().identityField));
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.every(({ message }) => message.startsWith(SERVABLE_IDENTITY_RULE))).toBe(true);
      expect(issues.map(({ path }) => path)).toEqual(
        expect.arrayContaining([
          ['identityField', 'fieldEvaluations'],
          ['identityField', 'euidRanking', 'branches'],
          ['identityField', 'euidRanking', 'branches', 0, 'when'],
        ])
      );
    });
  });

  describe('attributes are not identity fields', () => {
    const withAttribute = (identityField: EntityIdentity, field: string) =>
      definition(identityField, {
        dynamic: {
          sources: [
            { indexPattern: 'metrics-a-*' },
            { indexPattern: 'metrics-b-*', attributes: [{ name: 'repeated', field }] },
          ],
        },
      });

    it('rejects an attribute on the single identity field', () => {
      expectRejected(
        withAttribute({ singleField: 'k8s.pod.uid' }, 'k8s.pod.uid'),
        ['dynamic', 'sources', 1, 'attributes', 0, 'field'],
        NO_IDENTITY_ATTRIBUTE_RULE
      );
    });

    it('rejects an attribute on a ranking field', () => {
      expectRejected(
        withAttribute(hostIdentity, 'host.name'),
        ['dynamic', 'sources', 1, 'attributes', 0, 'field'],
        NO_IDENTITY_ATTRIBUTE_RULE
      );
    });

    it('accepts an attribute on a different field', () => {
      expectAccepted(withAttribute(hostIdentity, 'host.os.name'));
    });
  });

  describe('without dynamic', () => {
    const withoutDynamic = omit(definition(buildUserEntityDefinition().identityField), 'dynamic');

    it('does not apply either rule', () => {
      expectAccepted(withoutDynamic);
      expectAccepted({
        ...withoutDynamic,
        identityField: { singleField: 'a.*', skipTypePrepend: true },
      });
    });
  });
});
