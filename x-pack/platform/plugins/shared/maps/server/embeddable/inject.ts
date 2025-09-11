/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import type { Reference } from '@kbn/content-management-utils';
import type { MapAttributes } from '../../common/content_management';
import { injectReferences } from '../../common/migrations/references';

export function inject(
  state: EmbeddableStateWithType & { attributes?: MapAttributes },
  references: Reference[]
) {
  // by-reference embeddable
  if (!state.attributes) {
    return state;
  }

  // by-value embeddable
  try {
    const { attributes: attributesWithInjectedIds } = injectReferences({
      attributes: state.attributes,
      references,
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
