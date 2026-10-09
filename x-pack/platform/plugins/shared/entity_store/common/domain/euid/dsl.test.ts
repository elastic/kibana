/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEuidDslFilterBasedOnDocument,
  getEuidDslFilterBasedOnEntityRecord,
  getEuidDslDocumentsContainsIdFilter,
} from './dsl';

const fieldMissingOrEmpty = (field: string) => ({
  bool: {
    should: [{ bool: { must_not: [{ exists: { field } }] } }, { term: { [field]: '' } }],
    minimum_should_match: 1,
  },
});

describe('getEuidDslFilterBasedOnDocument', () => {
  it('returns undefined when doc is falsy', () => {
    expect(getEuidDslFilterBasedOnDocument('host', null)).toBeUndefined();
    expect(getEuidDslFilterBasedOnDocument('generic', undefined)).toBeUndefined();
    expect(getEuidDslFilterBasedOnDocument('user', {})).toBeUndefined();
  });

  describe('generic', () => {
    it('returns bool filter with term on entity.id when present', () => {
      const result = getEuidDslFilterBasedOnDocument('generic', { entity: { id: 'e-123' } });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'entity.id': 'e-123' } }],
        },
      });
    });

    it('unwraps _source when doc is an Elasticsearch hit', () => {
      const result = getEuidDslFilterBasedOnDocument('generic', {
        _source: { entity: { id: 'e-123' } },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'entity.id': 'e-123' } }],
        },
      });
    });
  });

  describe('host', () => {
    it('returns filter with term on host.id when present', () => {
      const result = getEuidDslFilterBasedOnDocument('host', {
        host: { name: 'to-be-ignored', id: 'host-id-1' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.id': 'host-id-1' } }],
        },
      });
    });

    it('returns filter with term on host.id when present (with flattened source)', () => {
      const result = getEuidDslFilterBasedOnDocument('host', {
        _source: {
          'host.name': 'to-be-ignored',
          'host.id': 'host-id-1',
        },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.id': 'host-id-1' } }],
        },
      });
    });

    it('returns filter with term on host.name when host.id is missing', () => {
      const result = getEuidDslFilterBasedOnDocument('host', { host: { name: 'server1' } });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.name': 'server1' } }],
          must: [fieldMissingOrEmpty('host.id')],
        },
      });
    });

    it('returns filter with term on host.hostname when host.id and host.name are missing', () => {
      const result = getEuidDslFilterBasedOnDocument('host', { host: { hostname: 'node-1' } });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.hostname': 'node-1' } }],
          must: [fieldMissingOrEmpty('host.id'), fieldMissingOrEmpty('host.name')],
        },
      });
    });

    it('precedence: uses host.id when both host.id and host.name are present', () => {
      const result = getEuidDslFilterBasedOnDocument('host', {
        host: { id: 'e1', name: 'myserver' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.id': 'e1' } }],
        },
      });
    });
  });

  describe('user', () => {
    it('returns filter with term on user.email and source clause (event.module whenClause expands to sourceMatchesAny)', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com' },
        event: { kind: 'asset', module: 'okta' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.email': 'alice@example.com' } },
            {
              bool: {
                should: [
                  { term: { 'event.module': 'okta' } },
                  { prefix: { 'data_stream.dataset': 'okta' } },
                  { term: { 'event.module': 'entityanalytics_okta' } },
                  { prefix: { 'data_stream.dataset': 'entityanalytics_okta' } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      });
    });

    it('returns filter with term on user.email and unknown source clause when no event.module or data_stream.dataset', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com' },
        event: { kind: 'asset' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.email': 'alice@example.com' } },
            {
              bool: {
                must: [
                  {
                    bool: {
                      should: [
                        { bool: { must_not: [{ exists: { field: 'event.module' } }] } },
                        { term: { 'event.module': '' } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [
                        { bool: { must_not: [{ exists: { field: 'data_stream.dataset' } }] } },
                        { term: { 'data_stream.dataset': '' } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
          ],
        },
      });
    });

    it('returns filter with term on user.name and source clause and must on higher-ranked fields missing-or-empty', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { name: 'alice' },
        event: { kind: 'asset', module: 'azure' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.name': 'alice' } },
            {
              bool: {
                should: [
                  { term: { 'event.module': 'azure' } },
                  { prefix: { 'data_stream.dataset': 'azure' } },
                  { term: { 'event.module': 'entityanalytics_entra_id' } },
                  { prefix: { 'data_stream.dataset': 'entityanalytics_entra_id' } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          must: [
            fieldMissingOrEmpty('user.email'),
            fieldMissingOrEmpty('user.id'),
            fieldMissingOrEmpty('user.domain'),
          ],
        },
      });
    });

    it('returns undefined when doc passes documentsFilter but fails postAggFilter (no asset/iam/entity.id)', () => {
      expect(
        getEuidDslFilterBasedOnDocument('user', {
          user: { id: 'user-id-42' },
          event: { module: 'o365' },
        })
      ).toBeUndefined();
    });

    it('returns undefined when no user id fields are present', () => {
      expect(getEuidDslFilterBasedOnDocument('user', {})).toBeUndefined();
    });

    it('precedence: uses user.email and source clause when both user.email and user.id are present', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com', id: 'user-42' },
        event: { kind: 'asset', module: 'entityanalytics_okta' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.email': 'alice@example.com' } },
            {
              bool: {
                should: [
                  { term: { 'event.module': 'okta' } },
                  { prefix: { 'data_stream.dataset': 'okta' } },
                  { term: { 'event.module': 'entityanalytics_okta' } },
                  { prefix: { 'data_stream.dataset': 'entityanalytics_okta' } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      });
    });

    it('returns filter for user.name and user.domain with source clause and must on higher-ranked fields missing-or-empty', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { name: 'jane', domain: 'corp.com' },
        event: { kind: 'asset', module: 'entityanalytics_ad' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.name': 'jane' } },
            { term: { 'user.domain': 'corp.com' } },
            {
              bool: {
                should: [
                  { term: { 'event.module': 'entityanalytics_ad' } },
                  { prefix: { 'data_stream.dataset': 'entityanalytics_ad' } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          must: [fieldMissingOrEmpty('user.email'), fieldMissingOrEmpty('user.id')],
        },
      });
    });

    it('excludes all fieldEvaluation destinations (e.g. entity.namespace) from filter and must so the query can match stored documents', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { email: 'bob@example.com' },
        event: { kind: 'asset', module: 'okta' },
      });
      const filter = result?.bool?.filter as Array<{ term?: Record<string, string> }> | undefined;
      const filterFields = Array.isArray(filter)
        ? filter.map((clause) => Object.keys(clause.term ?? {})[0])
        : [];
      const must = (result?.bool?.must ?? []) as unknown[];
      expect(filterFields).not.toContain('entity.namespace');
      expect(JSON.stringify(must)).not.toContain('entity.namespace');
      expect(result?.bool?.must_not).toBeUndefined();
    });

    it('returns filter for user.name and host.id when fieldEvaluations set entity.namespace to local (non-IDP)', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { name: 'alice' },
        host: { id: 'host-1' },
        event: { kind: 'event', category: 'authentication' },
      });

      expect(result).toBeDefined();
      expect(result?.bool?.filter).toEqual(
        expect.arrayContaining([
          { term: { 'user.name': 'alice' } },
          { term: { 'host.id': 'host-1' } },
        ])
      );
      const filter = result?.bool?.filter as Array<{ term?: Record<string, string> }> | undefined;
      const filterFields = Array.isArray(filter)
        ? filter.map((clause) => Object.keys(clause.term ?? {})[0]).filter(Boolean)
        : [];
      expect(filterFields).not.toContain('entity.namespace');
    });

    it('evaluates correctly for real non-IDP document', () => {
      expect(
        getEuidDslFilterBasedOnDocument('user', {
          '@timestamp': '2026-04-22T12:55:59.638Z',
          data_stream: {
            dataset: ['endpoint.events.file', 'endpoint.events.process'],
          },
          host: {
            name: 'tyrese.goldner-mac',
            id: '4a7a8b68-1814-487f-9e56-5e7bed425edc',
          },
          event: {
            kind: 'event',
            module: 'endpoint',
            category: ['file', 'process'],
            type: ['creation', 'info'],
            dataset: ['endpoint.events.file', 'endpoint.events.process'],
          },
          user: {
            name: 'tyrese.goldner',
            id: '1025',
          },
          entity: {
            lifecycle: {
              first_seen: '2026-04-22T10:14:02.635Z',
              last_seen: '2026-04-22T12:55:59.638Z',
            },
            EngineMetadata: {
              Type: 'user',
              UntypedId: 'tyrese.goldner@4a7a8b68-1814-487f-9e56-5e7bed425edc@local',
            },
            confidence: 'medium',
            namespace: 'local',
            name: 'tyrese.goldner@tyrese.goldner-mac',
            source: 'endpoint',
            id: 'user:tyrese.goldner@4a7a8b68-1814-487f-9e56-5e7bed425edc@local',
            type: 'Identity',
          },
        })
      ).toMatchSnapshot();
    });

    it('generates distinct DSL filters for user:alice@aws vs user:alice@gcp (cloud.provider disambiguation)', () => {
      const awsDoc = {
        user: { name: 'alice' },
        event: { kind: 'asset', module: 'asset_discovery' },
        cloud: { provider: 'aws' },
      };
      const gcpDoc = {
        user: { name: 'alice' },
        event: { kind: 'asset', module: 'asset_discovery' },
        cloud: { provider: 'gcp' },
      };

      const awsFilter = getEuidDslFilterBasedOnDocument('user', awsDoc);
      const gcpFilter = getEuidDslFilterBasedOnDocument('user', gcpDoc);

      expect(awsFilter).toBeDefined();
      expect(gcpFilter).toBeDefined();

      // Full-object snapshots: verify the exact DSL shape including the compound condition
      // (event.kind=asset AND event.module=asset_discovery AND cloud.provider==<value>).
      expect(awsFilter).toMatchSnapshot('aws filter');
      expect(gcpFilter).toMatchSnapshot('gcp filter');

      const awsJson = JSON.stringify(awsFilter);
      const gcpJson = JSON.stringify(gcpFilter);

      // No cross-contamination: the aws filter must not reference gcp and vice versa.
      expect(awsJson).not.toContain('"gcp"');
      expect(gcpJson).not.toContain('"aws"');

      // The two filters are entirely different.
      expect(awsJson).not.toEqual(gcpJson);
    });

    it('does not include cloud.provider filter when event.module is not asset_discovery', () => {
      // Other integrations sending event.kind=asset must NOT be routed via cloud.provider.
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { name: 'alice' },
        event: { kind: 'asset', module: 'other_integration' },
        cloud: { provider: 'aws' },
      });

      expect(result).toBeDefined();
      // cloud.provider must NOT appear in the filter — namespace is determined by event.module.
      expect(JSON.stringify(result)).not.toContain('cloud.provider');
    });
  });

  describe('service', () => {
    it('returns undefined when service.name is missing (single-field identity)', () => {
      const result = getEuidDslFilterBasedOnDocument('service', {
        service: { entity: { id: 'svc-entity-1' } },
      });

      expect(result).toBeUndefined();
    });

    it('returns filter with term on service.name (single-field identity)', () => {
      const result = getEuidDslFilterBasedOnDocument('service', {
        service: { name: 'api-gateway' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'service.name': 'api-gateway' } }],
        },
      });
    });

    it('uses service.name when both service.entity.id and service.name are present (single-field identity)', () => {
      const result = getEuidDslFilterBasedOnDocument('service', {
        service: { entity: { id: 'svc-e1' }, name: 'api-gateway' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'service.name': 'api-gateway' } }],
        },
      });
    });
  });
});

describe('getEuidDslFilterBasedOnEntityRecord', () => {
  it('returns undefined when the record is falsy', () => {
    expect(getEuidDslFilterBasedOnEntityRecord('user', null)).toBeUndefined();
    expect(getEuidDslFilterBasedOnEntityRecord('host', undefined)).toBeUndefined();
    expect(getEuidDslFilterBasedOnEntityRecord('user', {})).toBeUndefined();
  });

  describe('host / service / generic (delegates to document-based builder)', () => {
    it('host: filters on host.id when present', () => {
      const result = getEuidDslFilterBasedOnEntityRecord('host', {
        entity: { namespace: 'ignored' },
        host: { id: 'host-id-1', name: 'to-be-ignored' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.id': 'host-id-1' } }],
        },
      });
    });

    it('host: filters on host.name with host.id missing guard', () => {
      const result = getEuidDslFilterBasedOnEntityRecord('host', {
        host: { name: 'server1' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.name': 'server1' } }],
          must: [fieldMissingOrEmpty('host.id')],
        },
      });
    });

    it('service: filters on service.name (single-field identity)', () => {
      const result = getEuidDslFilterBasedOnEntityRecord('service', {
        service: { name: 'api-gateway' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'service.name': 'api-gateway' } }],
        },
      });
    });
  });

  describe('user (trusts resolved entity.namespace, reverse-maps source clause)', () => {
    it('okta: filters on user.email and okta source values, without re-deriving namespace', () => {
      const result = getEuidDslFilterBasedOnEntityRecord('user', {
        entity: { namespace: 'okta' },
        user: { email: 'alice@example.com' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.email': 'alice@example.com' } },
            {
              bool: {
                should: [
                  { term: { 'event.module': 'okta' } },
                  { prefix: { 'data_stream.dataset': 'okta' } },
                  { term: { 'event.module': 'entityanalytics_okta' } },
                  { prefix: { 'data_stream.dataset': 'entityanalytics_okta' } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      });
    });

    it('microsoft_365: filters on user.id with higher-ranked user.email missing guard', () => {
      const result = getEuidDslFilterBasedOnEntityRecord('user', {
        entity: { namespace: 'microsoft_365' },
        user: { id: 'user-42' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.id': 'user-42' } },
            {
              bool: {
                should: [
                  { term: { 'event.module': 'o365' } },
                  { prefix: { 'data_stream.dataset': 'o365' } },
                  { term: { 'event.module': 'o365_metrics' } },
                  { prefix: { 'data_stream.dataset': 'o365_metrics' } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          must: [fieldMissingOrEmpty('user.email')],
        },
      });
    });

    it('active_directory: filters on user.name + user.domain with email/id missing guards', () => {
      const result = getEuidDslFilterBasedOnEntityRecord('user', {
        entity: { namespace: 'active_directory' },
        user: { name: 'jane', domain: 'corp.com' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.name': 'jane' } },
            { term: { 'user.domain': 'corp.com' } },
            {
              bool: {
                should: [
                  { term: { 'event.module': 'entityanalytics_ad' } },
                  { prefix: { 'data_stream.dataset': 'entityanalytics_ad' } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          must: [fieldMissingOrEmpty('user.email'), fieldMissingOrEmpty('user.id')],
        },
      });
    });

    it('entra_id: OR-s the IdP source values and the asset_discovery cloud.provider path', () => {
      const result = getEuidDslFilterBasedOnEntityRecord('user', {
        entity: { namespace: 'entra_id' },
        user: { email: 'bob@example.com' },
      });

      // `entra_id` is reachable from two whenClause arms, so the source clause must OR both, and it
      // must not matter which one originally produced the namespace (see the determinism suite below).
      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.email': 'bob@example.com' } },
            {
              bool: {
                minimum_should_match: 1,
                should: [
                  // asset_discovery path: event.kind=asset AND event.module=asset_discovery AND
                  // cloud.provider=azure (the source key that maps to entra_id)
                  {
                    bool: {
                      must: [
                        {
                          bool: {
                            must: [
                              { terms: { 'event.kind': ['asset'] } },
                              { terms: { 'event.module': ['asset_discovery'] } },
                            ],
                          },
                        },
                        { match: { 'cloud.provider': 'azure' } },
                      ],
                    },
                  },
                  // traditional ranking path: the IdP source values for entra_id
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        { term: { 'event.module': 'azure' } },
                        { prefix: { 'data_stream.dataset': 'azure' } },
                        { term: { 'event.module': 'entityanalytics_entra_id' } },
                        { prefix: { 'data_stream.dataset': 'entityanalytics_entra_id' } },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      });
    });

    it('local: filters on user.name + host.id with the local namespace gate condition', () => {
      const result = getEuidDslFilterBasedOnEntityRecord('user', {
        entity: { namespace: 'local', id: 'user:jdoe@host-1@local' },
        user: { name: 'jdoe' },
        host: { id: 'host-1' },
      });

      // The local branch ranks on user.name + host.id (see userEntityDefinition euidRanking).
      const filter = result?.bool?.filter as Array<{ term?: Record<string, string> }> | undefined;
      expect(filter?.slice(0, 2)).toEqual([
        { term: { 'user.name': 'jdoe' } },
        { term: { 'host.id': 'host-1' } },
      ]);
      // The third clause is the `local` namespace gate translated via conditionToQueryDsl. Assert it
      // exists as the only remaining clause and that nothing targets the evaluated entity.namespace
      // destination or leaks into a higher-ranked `must` guard (local is the top-ranked branch).
      expect(filter).toHaveLength(3);
      expect(result?.bool?.must).toBeUndefined();
      expect(JSON.stringify(result)).not.toContain('entity.namespace');
    });

    it('aws vs gcp: distinct cloud.provider disambiguation from the resolved namespace', () => {
      const awsFilter = getEuidDslFilterBasedOnEntityRecord('user', {
        entity: { namespace: 'aws' },
        user: { name: 'alice' },
      });
      const gcpFilter = getEuidDslFilterBasedOnEntityRecord('user', {
        entity: { namespace: 'gcp' },
        user: { name: 'alice' },
      });

      expect(awsFilter).toMatchSnapshot('aws record filter');
      expect(gcpFilter).toMatchSnapshot('gcp record filter');

      const awsJson = JSON.stringify(awsFilter);
      const gcpJson = JSON.stringify(gcpFilter);
      expect(awsJson).not.toContain('"gcp"');
      expect(gcpJson).not.toContain('"aws"');
      expect(awsJson).not.toEqual(gcpJson);
    });

    it('never emits a term on the evaluated entity.namespace destination', () => {
      const result = getEuidDslFilterBasedOnEntityRecord('user', {
        entity: { namespace: 'okta' },
        user: { email: 'carol@example.com' },
      });

      expect(JSON.stringify(result)).not.toContain('entity.namespace');
    });

    it('returns undefined when no identity fields are present on the record', () => {
      expect(
        getEuidDslFilterBasedOnEntityRecord('user', { entity: { namespace: 'okta' } })
      ).toBeUndefined();
    });
  });

  describe('determinism: same resolved namespace + identity yields identical DSL regardless of input variation', () => {
    // The builder reads only the record's already-resolved `entity.namespace` and identity fields —
    // never the raw source fields (event.module / data_stream.dataset / cloud.provider) that
    // originally derived the namespace. So once the namespace is resolved, you can't tell which path
    // produced it, and you don't need to: every record with the same namespace + identity yields
    // byte-identical DSL, whatever its shape or leftover raw fields. This is what makes trusting the
    // record safe, and it is why we don't re-derive the namespace here.
    const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, unknown> =>
      Object.entries(obj).reduce<Record<string, unknown>>((acc, [key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(acc, flatten(value as Record<string, unknown>, path));
        } else {
          acc[path] = value;
        }
        return acc;
      }, {});

    const cases = [
      {
        name: 'entra_id (email identity)',
        namespace: 'entra_id',
        identity: { user: { email: 'bob@example.com' } },
      },
      {
        name: 'okta (email identity)',
        namespace: 'okta',
        identity: { user: { email: 'alice@example.com' } },
      },
      {
        name: 'active_directory (name + domain identity)',
        namespace: 'active_directory',
        identity: { user: { name: 'jane', domain: 'corp.com' } },
      },
      {
        name: 'local (name + host.id identity)',
        namespace: 'local',
        identity: { user: { name: 'jdoe' }, host: { id: 'host-1' } },
      },
    ];

    for (const { name, namespace, identity } of cases) {
      it(`${name}: nested / flattened / _source / leftover raw fields all produce the same DSL`, () => {
        const variations: Array<Record<string, unknown>> = [
          // baseline nested record
          { entity: { namespace }, ...identity },
          // flattened (dotted-key) shape
          flatten({ entity: { namespace }, ...identity }),
          // wrapped as an Elasticsearch hit
          { _source: { entity: { namespace }, ...identity } },
          // leftover raw source fields that originally derived the namespace must be ignored
          {
            entity: { namespace },
            ...identity,
            event: { kind: 'asset', module: 'asset_discovery' },
            cloud: { provider: 'azure' },
            data_stream: { dataset: 'azure.signinlogs' },
          },
          // a stale/mismatched raw source field must NOT change the result — the resolved namespace
          // on the record is authoritative
          { entity: { namespace }, ...identity, event: { module: 'okta' } },
          // incidental entity-store fields (id, asset criticality, @timestamp) are irrelevant
          {
            '@timestamp': '2026-04-22T12:55:59.638Z',
            entity: { namespace, id: `user:whatever@${namespace}` },
            asset: { criticality: 'high_impact' },
            ...identity,
          },
        ];

        const [expected, ...rest] = variations.map((record) =>
          getEuidDslFilterBasedOnEntityRecord('user', record)
        );
        expect(expected).toBeDefined();
        for (const filter of rest) {
          expect(filter).toEqual(expected);
        }
      });
    }
  });
});

const isNotEmptyClause = (field: string) => ({
  bool: {
    must: [{ exists: { field } }, { bool: { must_not: { match: { [field]: '' } } } }],
  },
});

describe('getEuidDslDocumentsContainsIdFilter', () => {
  it('user: returns documentsFilter AND postAggFilter DSL (IDP or non-IDP only)', () => {
    const result = getEuidDslDocumentsContainsIdFilter('user');

    expect(result).toMatchSnapshot();
  });

  it('host: returns documentsFilter DSL (or of isNotEmpty for each identity field)', () => {
    const result = getEuidDslDocumentsContainsIdFilter('host');

    expect(result).toEqual({
      bool: {
        should: [
          isNotEmptyClause('host.id'),
          isNotEmptyClause('host.name'),
          isNotEmptyClause('host.hostname'),
        ],
      },
    });
  });

  it('service: returns documentsFilter DSL (service.name not empty)', () => {
    const result = getEuidDslDocumentsContainsIdFilter('service');

    expect(result).toEqual({
      bool: {
        must: [
          { exists: { field: 'service.name' } },
          { bool: { must_not: { match: { 'service.name': '' } } } },
        ],
      },
    });
  });

  it('generic: returns documentsFilter DSL (entity.id not empty)', () => {
    const result = getEuidDslDocumentsContainsIdFilter('generic');

    expect(result).toEqual({
      bool: {
        must: [
          { exists: { field: 'entity.id' } },
          { bool: { must_not: { match: { 'entity.id': '' } } } },
        ],
      },
    });
  });
});

describe('getEuidDslFilterBasedOnDocument with excludeHigherRankedFields: false (partial-identity lookup)', () => {
  const partialIdentityFilter = (
    entityType: Parameters<typeof getEuidDslFilterBasedOnDocument>[0],
    doc: any
  ) => getEuidDslFilterBasedOnDocument(entityType, doc, { excludeHigherRankedFields: false });

  it('returns undefined when doc is falsy', () => {
    expect(partialIdentityFilter('host', null)).toBeUndefined();
    expect(partialIdentityFilter('host', {})).toBeUndefined();
  });

  describe('host', () => {
    it('returns term-only filter on host.name with NO must clause (root cause regression guard)', () => {
      // This is the exact scenario from #278276: page passes only host.name, lookup should not
      // require host.id to be absent.
      const result = partialIdentityFilter('host', { host: { name: 'server1' } });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.name': 'server1' } }],
        },
      });
      // Explicitly assert no must clause so a future regression immediately fails this test.
      expect(result?.bool?.must).toBeUndefined();
    });

    it('returns term-only filter on host.hostname with NO must clause', () => {
      const result = partialIdentityFilter('host', {
        host: { hostname: 'node-1' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.hostname': 'node-1' } }],
        },
      });
      expect(result?.bool?.must).toBeUndefined();
    });

    it('returns filter on host.id unchanged (rank 0 — no higher-ranked fields)', () => {
      const result = partialIdentityFilter('host', {
        host: { name: 'ignored', id: 'host-id-1' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.id': 'host-id-1' } }],
        },
      });
    });
  });

  describe('user', () => {
    it('returns filter on user.name with source clause but NO must on higher-ranked absent fields', () => {
      // Default partition semantics would add must:[fieldMissingOrEmpty('user.email'),
      // fieldMissingOrEmpty('user.id'),fieldMissingOrEmpty('user.domain')]. Lookup must NOT add those.
      const result = partialIdentityFilter('user', {
        user: { name: 'alice' },
        event: { kind: 'asset', module: 'azure' },
      });

      expect(result?.bool?.filter).toContainEqual({ term: { 'user.name': 'alice' } });
      expect(result?.bool?.must).toBeUndefined();
    });
  });
});
