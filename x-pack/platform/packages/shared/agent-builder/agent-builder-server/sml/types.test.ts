/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SmlTypeDefinition,
  SmlEntry,
  SmlDocument,
  SmlPermissions,
  SmlSearchResult,
  SmlAutocompleteResult,
  SmlIndexAction,
  SmlDeleteScope,
} from './types';

describe('SML type definitions', () => {
  it('SmlTypeDefinition requires id, list, getSmlEntry, toAttachment', () => {
    const definition: SmlTypeDefinition = {
      id: 'test_type',
      async *list() {
        yield [];
      },
      getSmlEntry: async () => undefined,
      toAttachment: async () => undefined,
    };
    expect(definition.id).toBe('test_type');
  });

  it('SmlEntry requires type/content/title', () => {
    const entry: SmlEntry = { type: 'test_type', content: 'body', title: 'Title' };
    expect(entry.title).toBe('Title');
  });

  it('SmlDocument requires the full stored-document shape', () => {
    const permissions: SmlPermissions = {
      kibana: { privileges: [] },
      elasticsearch: { indices: [] },
    };
    const document: SmlDocument = {
      id: 'doc-1',
      type: 'test_type',
      title: 'Title',
      origin: { uri: 'test_type://doc-1' },
      content: 'body',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      spaces: ['default'],
      permissions,
      ingestion_method: 'manual',
    };
    expect(document.id).toBe('doc-1');
  });

  it('SmlSearchResult and SmlAutocompleteResult support the compact result shapes', () => {
    const searchResult: SmlSearchResult = {
      id: 'doc-1',
      type: 'test_type',
      title: 'Title',
      origin: { uri: 'test_type://doc-1' },
    };
    const autocompleteResult: SmlAutocompleteResult = {
      id: 'doc-1',
      type: 'test_type',
      title: 'Title',
      origin: { uri: 'test_type://doc-1' },
      permissions: { kibana: { privileges: [] }, elasticsearch: { indices: [] } },
      spaces: ['default'],
    };
    expect(searchResult.id).toBe(autocompleteResult.id);
  });

  it('SmlIndexAction and SmlDeleteScope enumerate the expected literals', () => {
    const actions: SmlIndexAction[] = ['create', 'update', 'delete'];
    const scopes: SmlDeleteScope[] = ['manual', 'crawled', 'all'];
    expect(actions).toContain('delete');
    expect(scopes).toContain('all');
  });
});
