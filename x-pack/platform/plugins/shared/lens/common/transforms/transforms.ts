/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableTransforms } from '@kbn/embeddable-plugin/common';

import type { LensSerializedState } from '../../public';
import {
  LENS_ITEM_VERSION as LENS_ITEM_VERSION_V1,
  transformToV1LensItemAttributes,
} from '../content_management/v1';

export const lensTransforms = {
  transformOut(state: LensSerializedState): LensSerializedState {
    // skip by-ref Lens panels
    if (!state.attributes) return state;

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
