/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  classifyPermission,
  buildCheckPrivilegesPayload,
  collectAuthorizedRawPermissions,
  type CheckPrivilegesResponsePrivileges,
} from './permissions_dsl';

describe('classifyPermission', () => {
  it('treats bare strings as Kibana privileges (legacy)', () => {
    expect(classifyPermission('saved_object:lens/get')).toEqual({
      kind: 'kibana',
      value: 'saved_object:lens/get',
      raw: 'saved_object:lens/get',
    });
  });

  it('strips the `kibana:` prefix for Kibana privileges', () => {
    expect(classifyPermission('kibana:saved_object:lens/get')).toEqual({
      kind: 'kibana',
      value: 'saved_object:lens/get',
      raw: 'kibana:saved_object:lens/get',
    });
  });

  it('strips the `es-cluster:` prefix for ES cluster privileges', () => {
    expect(classifyPermission('es-cluster:monitor')).toEqual({
      kind: 'es-cluster',
      value: 'monitor',
      raw: 'es-cluster:monitor',
    });
  });

  it('parses `es-index:<index>:<priv>` into index/value pair', () => {
    expect(classifyPermission('es-index:my-index:read')).toEqual({
      kind: 'es-index',
      index: 'my-index',
      value: 'read',
      raw: 'es-index:my-index:read',
    });
  });

  it('supports `es-index` privileges that themselves contain colons in their value', () => {
    expect(classifyPermission('es-index:logs-2024:view_index_metadata')).toEqual({
      kind: 'es-index',
      index: 'logs-2024',
      value: 'view_index_metadata',
      raw: 'es-index:logs-2024:view_index_metadata',
    });
  });

  it('falls back to Kibana when `es-index:` is malformed (no `:` after index)', () => {
    expect(classifyPermission('es-index:no-privilege')).toEqual({
      kind: 'kibana',
      value: 'es-index:no-privilege',
      raw: 'es-index:no-privilege',
    });
  });
});

describe('buildCheckPrivilegesPayload', () => {
  it('groups mixed Kibana / ES privileges into separate buckets', () => {
    const { payload, classified } = buildCheckPrivilegesPayload([
      'saved_object:lens/get',
      'kibana:api:foo',
      'es-cluster:monitor',
      'es-index:logs:read',
      'es-index:logs:view_index_metadata',
      'es-index:metrics:read',
    ]);

    expect(payload).toEqual({
      kibana: ['saved_object:lens/get', 'api:foo'],
      elasticsearch: {
        cluster: ['monitor'],
        index: {
          logs: ['read', 'view_index_metadata'],
          metrics: ['read'],
        },
      },
    });
    expect(classified).toHaveLength(6);
  });

  it('deduplicates privileges across the same bucket', () => {
    const { payload } = buildCheckPrivilegesPayload([
      'saved_object:lens/get',
      'kibana:saved_object:lens/get',
      'es-index:logs:read',
      'es-index:logs:read',
    ]);

    expect(payload).toEqual({
      kibana: ['saved_object:lens/get'],
      elasticsearch: { cluster: [], index: { logs: ['read'] } },
    });
  });

  it('omits buckets that have no entries', () => {
    const onlyKibana = buildCheckPrivilegesPayload(['saved_object:lens/get']);
    expect(onlyKibana.payload).toEqual({ kibana: ['saved_object:lens/get'] });
    expect(onlyKibana.payload.elasticsearch).toBeUndefined();

    const onlyEs = buildCheckPrivilegesPayload(['es-cluster:monitor']);
    expect(onlyEs.payload).toEqual({
      elasticsearch: { cluster: ['monitor'], index: {} },
    });
    expect(onlyEs.payload.kibana).toBeUndefined();
  });

  it('returns an empty payload (no keys) when input is empty', () => {
    expect(buildCheckPrivilegesPayload([])).toEqual({ payload: {}, classified: [] });
  });
});

describe('collectAuthorizedRawPermissions', () => {
  const buildResponse = (
    overrides: Partial<CheckPrivilegesResponsePrivileges> = {}
  ): CheckPrivilegesResponsePrivileges => ({
    kibana: [],
    ...overrides,
  });

  it('returns the original raw strings for authorized Kibana privileges', () => {
    const { classified } = buildCheckPrivilegesPayload([
      'saved_object:lens/get',
      'kibana:saved_object:lens/get',
    ]);
    const response = buildResponse({
      kibana: [{ privilege: 'saved_object:lens/get', authorized: true }],
    });

    const authorized = collectAuthorizedRawPermissions(classified, response);
    // Both raw forms (with and without prefix) round-trip back to their
    // ORIGINAL stored representation.
    expect([...authorized].sort()).toEqual([
      'kibana:saved_object:lens/get',
      'saved_object:lens/get',
    ]);
  });

  it('routes ES cluster / index privileges via the elasticsearch response shape', () => {
    const { classified } = buildCheckPrivilegesPayload([
      'es-cluster:monitor',
      'es-index:logs:read',
      'es-index:logs:view_index_metadata',
    ]);
    const response = buildResponse({
      kibana: [],
      elasticsearch: {
        cluster: [{ privilege: 'monitor', authorized: true }],
        index: {
          logs: [
            { privilege: 'read', authorized: true },
            { privilege: 'view_index_metadata', authorized: false },
          ],
        },
      },
    });

    const authorized = collectAuthorizedRawPermissions(classified, response);
    expect([...authorized].sort()).toEqual(['es-cluster:monitor', 'es-index:logs:read']);
  });

  it('omits raw strings that did not come back as authorized', () => {
    const { classified } = buildCheckPrivilegesPayload([
      'saved_object:dashboard/get',
      'saved_object:lens/get',
    ]);
    const response = buildResponse({
      kibana: [
        { privilege: 'saved_object:dashboard/get', authorized: false },
        { privilege: 'saved_object:lens/get', authorized: true },
      ],
    });

    const authorized = collectAuthorizedRawPermissions(classified, response);
    expect([...authorized]).toEqual(['saved_object:lens/get']);
  });

  it('returns an empty set when the response has no `elasticsearch` field but classified contains ES privileges', () => {
    const { classified } = buildCheckPrivilegesPayload(['es-cluster:monitor']);
    const response = buildResponse({ kibana: [] });
    expect(collectAuthorizedRawPermissions(classified, response).size).toBe(0);
  });
});
