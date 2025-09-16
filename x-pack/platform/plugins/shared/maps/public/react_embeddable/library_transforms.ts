/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HasLibraryTransforms, SerializedPanelState } from '@kbn/presentation-publishing';
import { extractReferences } from '../../common/migrations/references';
import { getCore, getCoreOverlays } from '../kibana_services';
import type { MapAttributes } from '../../common/content_management';
import { checkForDuplicateTitle, getMapClient } from '../content_management';
import { MAP_EMBEDDABLE_NAME } from '../../common/constants';
import type { MapByValueState, MapByReferenceState, MapEmbeddableState } from '../../common';

export function getByReferenceState(state: MapEmbeddableState | undefined, savedObjectId: string) {
  const { attributes, ...byRefState } = (state as MapByValueState) ?? {};
  return {
    ...byRefState,
    savedObjectId,
  };
}

export function getByValueState(state: MapEmbeddableState | undefined, attributes: MapAttributes) {
  const { savedObjectId, ...byValueState } = (state as MapByReferenceState) ?? {};
  return {
    ...byValueState,
    attributes,
  };
}

export function initializeLibraryTransforms(
  isByReference: boolean,
  serializeByReference: (libraryId: string) => SerializedPanelState<MapByReferenceState>,
  serializeByValue: () => SerializedPanelState<MapByValueState>
): HasLibraryTransforms<MapByReferenceState, MapByValueState> {
  return {
    canLinkToLibrary: async () => {
      const { maps_v2: maps } = getCore().application.capabilities;
      return maps.save && !isByReference;
    },
    canUnlinkFromLibrary: async () => {
      return isByReference;
    },
    saveToLibrary: async (title: string) => {
      const state = serializeByValue();
      const { attributes, references } = extractReferences({
        attributes: state.rawState.attributes,
      });
      const {
        item: { id: savedObjectId },
      } = await getMapClient().create({
        data: {
          ...attributes,
          title,
        },
        options: { references },
      });
      return savedObjectId;
    },
    getSerializedStateByReference: serializeByReference,
    getSerializedStateByValue: serializeByValue,
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
  };
}
