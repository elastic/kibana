/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { extractReferences } from '../../common/migrations/references';
import type { StoredMapAttributes } from '../saved_objects/types';

export function extract(state: EmbeddableStateWithType & { attributes?: StoredMapAttributes }) {
  // by-reference embeddable
  if (!state.attributes) {
    // No references to extract for by-reference embeddable since all references are stored with by-reference saved object
    return { state, references: [] };
  }

  // by-value embeddable
  const { attributes, references } = extractReferences({
    attributes: state.attributes,
  });

  return {
    state: {
      ...state,
      attributes,
    },
    references,
  };
}
