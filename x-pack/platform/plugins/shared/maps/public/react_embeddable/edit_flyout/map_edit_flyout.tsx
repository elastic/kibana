/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EmbeddableRenderer,
  PanelEditFlyout,
  type PanelSettingsApi,
} from '@kbn/embeddable-plugin/public';
import { apiPublishesUnifiedSearch } from '@kbn/presentation-publishing';
import type { MapEmbeddableState } from '../../../common';
import { MAP_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { MapSettings } from '../../../common/descriptor_types';
import { getTimeFilter } from '../../kibana_services';
import type { MapApi } from '../types';
import { MAP_RENDERER_TYPE } from '../map_renderer/types';

/** The preview only shows the map, all controls and interactions are disabled */
const PREVIEW_MAP_SETTINGS: Partial<MapSettings> = {
  disableInteractive: true,
  disableTooltipControl: true,
  hideToolbarOverlay: true,
  hideLayerControl: true,
  hideViewControl: true,
};

const MapPreview = ({ state, parentApi }: { state: MapEmbeddableState; parentApi: unknown }) => {
  const [previewState] = useState<MapEmbeddableState>(() => ({
    ...state,
    mapSettings: { ...state.mapSettings, ...PREVIEW_MAP_SETTINGS },
    isLayerTOCOpen: false,
    // keep the preview from syncing with, or filtering, the other panels
    isMovementSynchronized: false,
    filterByMapExtent: false,
  }));

  const getParentApi = useCallback(
    () => ({
      type: MAP_RENDERER_TYPE,
      hideFilterActions: true,
      getSerializedStateForChild: () => previewState,
      // render with the same filters, query and time range as the panel
      ...(apiPublishesUnifiedSearch(parentApi)
        ? {
            filters$: parentApi.filters$,
            query$: parentApi.query$,
            timeRange$: parentApi.timeRange$,
          }
        : {}),
    }),
    [parentApi, previewState]
  );

  return (
    <div className="mapEmbeddableContainer" data-test-subj="mapEditFlyoutPreview">
      <EmbeddableRenderer<MapEmbeddableState, MapApi>
        type={MAP_SAVED_OBJECT_TYPE}
        getParentApi={getParentApi}
        hidePanelChrome
      />
    </div>
  );
};

export interface MapEditFlyoutProps {
  api: PanelSettingsApi;
  parentApi: unknown;
  getState: () => MapEmbeddableState;
  /** Opens the map in the Maps app. Not provided when the user can't edit maps. */
  navigateToEditor?: () => Promise<void>;
  closeFlyout: () => void;
  ariaLabelledBy: string;
}

export const MapEditFlyout = ({
  api,
  parentApi,
  getState,
  navigateToEditor,
  closeFlyout,
  ariaLabelledBy,
}: MapEditFlyoutProps) => {
  const [initialState] = useState(getState);
  const globalTimeRange = useMemo(() => getTimeFilter().getTime(), []);

  return (
    <PanelEditFlyout
      api={api}
      title={i18n.translate('xpack.maps.editFlyout.title', {
        defaultMessage: 'Edit map',
      })}
      preview={<MapPreview state={initialState} parentApi={parentApi} />}
      editorLinkLabel={i18n.translate('xpack.maps.editFlyout.editInMapsLabel', {
        defaultMessage: 'Edit in Maps',
      })}
      onNavigateToEditor={navigateToEditor}
      fallbackTimeRange={globalTimeRange}
      closeFlyout={closeFlyout}
      ariaLabelledBy={ariaLabelledBy}
    />
  );
};
