/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableTransforms } from '@kbn/embeddable-plugin/common';
import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';

import type { LensSerializedState } from '../../public/react_embeddable/types';
import {
  LENS_ITEM_VERSION_V1,
  transformToV1LensItemAttributes,
} from '../../common/content_management/v1';

// TODO: use cm transforms instead
export const getLensServerTransforms = (builder: LensConfigBuilder) => {
  return {
    transformOut(state: LensSerializedState): LensSerializedState {
      if (!state.attributes) return state; // skip by-ref Lens panels

      const version = state.attributes.version ?? 0;
      const newState = { ...state };

      if (version < LENS_ITEM_VERSION_V1) {
        newState.attributes = transformToV1LensItemAttributes({
          ...state.attributes,
          description: state.attributes.description ?? '',
        }) as LensSerializedState['attributes'];
      }

      return newState;
    },
  } satisfies EmbeddableTransforms<LensSerializedState, LensSerializedState>;
};
