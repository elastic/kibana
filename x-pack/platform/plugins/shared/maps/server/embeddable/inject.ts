/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import type { Reference } from '@kbn/content-management-utils';
import { extractReferences, injectReferences } from '../../common/migrations/references';
import type { StoredMapAttributes } from '../saved_objects/types';

export function inject(
  state: EmbeddableStateWithType & { attributes?: StoredMapAttributes },
  references: Reference[]
) {
  // by-reference embeddable
  if (!state.attributes) {
    return state;
  }

  // by-value embeddable
  try {
    // run state through extract logic to ensure any state with hard coded ids is replace with refNames
    // refName generation will produce consistent values allowing inject logic to then replace refNames with current ids.
    const attributesWithNoHardCodedIds = extractReferences({
      attributes: state.attributes,
    }).attributes;
    const { attributes: attributesWithInjectedIds } = injectReferences({
      attributes: attributesWithNoHardCodedIds,
      findReference: (targetName: string) => references.find(({ name }) => name === targetName),
    });
    return {
      ...state,
      attributes: attributesWithInjectedIds,
    };
  } catch (error) {
    // inject exception prevents entire dashboard from display
    // Instead of throwing, swallow error and let dashboard display
    // Errors will surface in map panel. Any layer that failed injection will surface the error in the legend
    // Users can then manually edit map to resolve any problems.
    return state;
  }
}
