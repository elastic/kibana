/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureLibraryReference } from './ensure_library_reference';

describe('ensureLibraryReference', () => {
  it('does nothing if library reference is already named savedObjectRef', () => {
    const originalReferences = [{ id: 'test-id', name: 'savedObjectRef', type: 'lens' }];
    const references = ensureLibraryReference(originalReferences, 'lens', 'embeddable.id');
    expect(references).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "test-id",
          "name": "savedObjectRef",
          "type": "lens",
        },
      ]
    `);
  });

  it('ensures library reference is named savedObjectRef', () => {
    const originalReferences = [{ id: 'test-id', name: 'embeddable.id', type: 'lens' }];
    const references = ensureLibraryReference(originalReferences, 'lens', 'embeddable.id');
    expect(references).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "test-id",
          "name": "savedObjectRef",
          "type": "lens",
        },
      ]
    `);
  });

  it('adds library reference when not provided', () => {
    const references = ensureLibraryReference([], 'lens', 'embeddable.id');
    expect(references).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "embeddable.id",
          "name": "savedObjectRef",
          "type": "lens",
        },
      ]
    `);
  });
});
