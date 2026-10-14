/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../definitions/entity_schema';
import { getBuiltInEntityDefinition } from '../definitions/registry';
import {
  getEuidSourceFields,
  getEuidNamespaceSourceFields,
  getEuidNamespaceSourcePrefix,
} from './identity_fields';

describe('getEuidSourceFields', () => {
  it('returns expected host identity invariants deduplicated', () => {
    const result = getEuidSourceFields(getBuiltInEntityDefinition(EntityType.enum.host));

    expect(result.requiresOneOf).toEqual(result.identitySourceFields);
    expect(result.requiresOneOf).toEqual(
      expect.arrayContaining(['host.id', 'host.name', 'host.hostname'])
    );
    expect(result.identitySourceFields).toHaveLength(new Set(result.identitySourceFields).size);
  });

  it('excludes fieldEvaluation destinations (entity.namespace, entity.confidence) for user', () => {
    const result = getEuidSourceFields(getBuiltInEntityDefinition(EntityType.enum.user));

    expect(result.identitySourceFields).not.toContain('entity.namespace');
    expect(result.identitySourceFields).not.toContain('entity.confidence');
    expect(result.identitySourceFields).toEqual(
      expect.arrayContaining(['user.email', 'user.id', 'user.name', 'user.domain', 'host.id'])
    );
    expect(result.requiresOneOf).toEqual(result.identitySourceFields);
  });
});

describe('getEuidNamespaceSourceFields', () => {
  it('splits the user namespace sources by how each is matched', () => {
    const result = getEuidNamespaceSourceFields(getBuiltInEntityDefinition(EntityType.enum.user));

    // `event.module` is declared as a plain `{ field }` source, so it is compared with a term;
    // `data_stream.dataset` is `{ firstChunkOfField, splitBy }`, so it needs a prefix.
    expect(result.exactMatchFields).toContain('event.module');
    expect(result.prefixMatchFields).toContain('data_stream.dataset');
    expect(result.exactMatchFields).not.toContain('data_stream.dataset');
    expect(result.prefixMatchFields).not.toContain('event.module');
  });

  it('returns nothing for a single-field identity, which has no field evaluations', () => {
    expect(
      getEuidNamespaceSourceFields(getBuiltInEntityDefinition(EntityType.enum.generic))
    ).toEqual({
      exactMatchFields: [],
      prefixMatchFields: [],
    });
  });
});

describe('getEuidNamespaceSourcePrefix', () => {
  it('reduces a prefix-matched value to the chunk before its delimiter', () => {
    expect(
      getEuidNamespaceSourcePrefix(
        getBuiltInEntityDefinition(EntityType.enum.user),
        'data_stream.dataset',
        'okta.system'
      )
    ).toBe('okta');
    expect(
      getEuidNamespaceSourcePrefix(
        getBuiltInEntityDefinition(EntityType.enum.user),
        'data_stream.dataset',
        'gcp.audit'
      )
    ).toBe('gcp');
    expect(
      getEuidNamespaceSourcePrefix(
        getBuiltInEntityDefinition(EntityType.enum.user),
        'data_stream.dataset',
        'entityanalytics_okta.user'
      )
    ).toBe('entityanalytics_okta');
  });

  it('does not merely strip a string prefix, so near-miss namespaces stay distinct', () => {
    // The reason callers must not use `value.startsWith(prefix)`: both of these start with `okta`
    // and `gcp` respectively, but each belongs to its own namespace.
    expect(
      getEuidNamespaceSourcePrefix(
        getBuiltInEntityDefinition(EntityType.enum.user),
        'data_stream.dataset',
        'okta_legacy.system'
      )
    ).toBe('okta_legacy');
    expect(
      getEuidNamespaceSourcePrefix(
        getBuiltInEntityDefinition(EntityType.enum.user),
        'data_stream.dataset',
        'gcp_beta.audit'
      )
    ).toBe('gcp_beta');
  });

  it('returns the whole value when it contains no delimiter', () => {
    expect(
      getEuidNamespaceSourcePrefix(
        getBuiltInEntityDefinition(EntityType.enum.user),
        'data_stream.dataset',
        'okta'
      )
    ).toBe('okta');
  });

  it('returns undefined for a field that is not a prefix-matched source', () => {
    // `event.module` is an exact-match source, so no prefix can be derived from it.
    expect(
      getEuidNamespaceSourcePrefix(
        getBuiltInEntityDefinition(EntityType.enum.user),
        'event.module',
        'okta'
      )
    ).toBeUndefined();
    // And a field the definition never mentions.
    expect(
      getEuidNamespaceSourcePrefix(
        getBuiltInEntityDefinition(EntityType.enum.user),
        'user.email',
        'alice@example.com'
      )
    ).toBeUndefined();
  });

  it('returns undefined for a single-field identity, which declares no namespace sources', () => {
    expect(
      getEuidNamespaceSourcePrefix(
        getBuiltInEntityDefinition(EntityType.enum.generic),
        'data_stream.dataset',
        'okta.system'
      )
    ).toBeUndefined();
  });
});
