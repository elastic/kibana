/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';

const BY_REF_LIBRARY_TYPES = ['search', 'visualization', 'lens', 'map'];

export function ensureLibraryReference(
  references: SavedObjectReference[],
  // pre-translated embeddable type. i.e. "search" not translated version "discover_session"
  storedEmbeddableType: string,
  panelRefName: string
) {
  let libraryRef: SavedObjectReference | undefined;
  const restOfRefs: SavedObjectReference[] = [];

  references.forEach((ref) => {
    if (ref.name === 'savedObjectRef') {
      libraryRef = ref;
    } else if (ref.name === panelRefName && BY_REF_LIBRARY_TYPES.includes(ref.type)) {
      libraryRef = {
        ...ref,
        // Embeddable transforms for BY_REF_LIBRARY_TYPES embeddable types
        // are looking for by-reference reference with name 'savedObjectRef'
        name: 'savedObjectRef',
      };
    } else {
      restOfRefs.push(ref);
    }
  });

  if (!libraryRef) {
    libraryRef = {
      id: panelRefName,
      // No mapping between embeddable type and library type is needed
      // stored embeddable types are identical to respective library types
      type: storedEmbeddableType, // happenstance that storedEmbeddableType is the library type
      name: 'savedObjectRef',
    };
  }

  return [libraryRef, ...restOfRefs];
}
