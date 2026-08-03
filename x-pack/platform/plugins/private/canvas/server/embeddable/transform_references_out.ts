/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';

const BY_REF_TYPES = ['search', 'visualization', 'lens', 'map'];

export function transformPanelReferencesOut(
  panelReferences: SavedObjectReference[],
  panelRefName?: string
) {
  return panelRefName
    ? panelReferences.map((ref) => {
        return ref.name === panelRefName && BY_REF_TYPES.includes(ref.type)
          ? {
              ...ref,
              // Embeddable transforms for BY_REF_TYPES embeddable types
              // are looking for by-reference reference with name 'savedObjectRef'
              name: 'savedObjectRef',
            }
          : ref;
      })
    : panelReferences;
}
