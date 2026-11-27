/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import { isByReferenceState } from '../../../common/by_reference';
import { CUSTOM_APP_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { CustomAppByReferenceState, CustomAppEmbeddableState } from '../schemas';

/** The name of the reference a dashboard keeps for the saved app a panel shows. */
export const CUSTOM_APP_SAVED_OBJECT_REF_NAME = 'savedObjectRef';

type StoredState = Omit<CustomAppByReferenceState, 'ref_id'> | CustomAppEmbeddableState;

/**
 * Moves the id of a saved app between a panel's state and the references of the dashboard that
 * has it, so that export, import and copying a dashboard to another space follow the platform's
 * rules for references instead of leaving an id behind in the state.
 */
export const getTransforms = () => ({
  transformIn: (
    state: CustomAppEmbeddableState
  ): { state: StoredState; references: SavedObjectReference[] } => {
    if (!isByReferenceState(state)) return { state, references: [] };

    const { ref_id: refId, ...rest } = state;
    return {
      state: rest,
      references: [
        { name: CUSTOM_APP_SAVED_OBJECT_REF_NAME, type: CUSTOM_APP_SAVED_OBJECT_TYPE, id: refId },
      ],
    };
  },

  transformOut: (
    storedState: StoredState,
    panelReferences?: SavedObjectReference[]
  ): CustomAppEmbeddableState => {
    const state = transformTitlesOut(storedState as never) as CustomAppEmbeddableState;
    const reference = (panelReferences ?? []).find(
      ({ type, name }) =>
        type === CUSTOM_APP_SAVED_OBJECT_TYPE && name === CUSTOM_APP_SAVED_OBJECT_REF_NAME
    );

    return reference ? ({ ...state, ref_id: reference.id } as CustomAppEmbeddableState) : state;
  },
});
