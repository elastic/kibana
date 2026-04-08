/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { VISUALIZE_EMBEDDABLE_TYPE, VISUALIZE_SAVED_OBJECT_TYPE } from '@kbn/visualizations-common';

const BY_REF_LIBRARY_TYPES = ['search', 'visualization', 'lens', 'map'];

export function ensureLibraryReference(
  references: SavedObjectReference[],
  embeddableType: string,
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
      type: getLibraryType(embeddableType),
      name: 'savedObjectRef',
    };
  }

  return [libraryRef, ...restOfRefs];
}

function getLibraryType(embeddableType: string) {
  if (embeddableType === LENS_EMBEDDABLE_TYPE) {
    return 'lens';
  }

  if (embeddableType === VISUALIZE_EMBEDDABLE_TYPE) {
    return VISUALIZE_SAVED_OBJECT_TYPE;
  }

  if (embeddableType === SEARCH_EMBEDDABLE_TYPE) {
    return 'search';
  }

  return embeddableType;
}
