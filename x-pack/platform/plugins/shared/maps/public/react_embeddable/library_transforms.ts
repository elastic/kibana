/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HasLibraryTransforms, SerializedPanelState } from '@kbn/presentation-publishing';
import { getCore, getCoreOverlays } from '../kibana_services';
import type { MapAttributes } from '../../common/content_management';
import { SavedMap } from '../routes/map_page';
import { checkForDuplicateTitle, getMapClient } from '../content_management';
import { MAP_EMBEDDABLE_NAME } from '../../common/constants';
import { MapSerializedState } from './types';

export function getByReferenceState(state: MapSerializedState | undefined, savedObjectId: string) {
  const { attributes, ...byRefState } = state ?? {};
  return {
    ...byRefState,
    savedObjectId,
  };
}

export function getByValueState(state: MapSerializedState | undefined, attributes: MapAttributes) {
  const { savedObjectId, ...byValueState } = state ?? {};
  return {
    ...byValueState,
    attributes,
  };
}

export function initializeLibraryTransforms(
  savedMap: SavedMap,
  serializeState: () => SerializedPanelState<MapSerializedState>
): HasLibraryTransforms<MapSerializedState, MapSerializedState> {
  return {
    canLinkToLibrary: async () => {
      const { maps_v2: maps } = getCore().application.capabilities;
      return maps.save && savedMap.getSavedObjectId() === undefined;
    },
    saveToLibrary: async (title: string) => {
      const state = serializeState();
      const {
        item: { id: savedObjectId },
      } = await getMapClient().create({
        data: {
          ...(state.rawState?.attributes ?? {}),
          title,
        },
        options: { references: state.references ?? [] },
      });
      return savedObjectId;
    },
    getSerializedStateByReference: (libraryId: string) => {
      const { rawState: initialRawState, references } = serializeState();
      const rawState = getByReferenceState(initialRawState, libraryId);
      return { rawState, references };
    },
    checkForDuplicateTitle: async (
      newTitle: string,
      isTitleDuplicateConfirmed: boolean,
      onTitleDuplicate: () => void
    ) => {
      await checkForDuplicateTitle(
        {
          title: newTitle,
          copyOnSave: false,
          lastSavedTitle: '',
          isTitleDuplicateConfirmed,
          getDisplayName: () => MAP_EMBEDDABLE_NAME,
          onTitleDuplicate,
        },
        {
          overlays: getCoreOverlays(),
        }
      );
    },
    canUnlinkFromLibrary: async () => {
      return savedMap.getSavedObjectId() !== undefined;
    },
    getSerializedStateByValue: () => {
      const { rawState: initialRawState, references } = serializeState();
      const rawState = getByValueState(initialRawState, savedMap.getAttributes());
      return { rawState, references };
    },
  };
}
