/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import uuid from 'uuid';
import { Query, esFilters } from 'src/plugins/data/common';
import { SavedObjectFinder } from 'ui/saved_objects/components/saved_object_finder';

import {
  EmbeddablePanel,
  ViewMode,
} from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { start } from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import * as i18n from './translations';
// @ts-ignore
import { MAP_SAVED_OBJECT_TYPE } from '../../../../../maps/common/constants';

import { MapEmbeddable } from './types';
import { getLayerList } from './map_config';

export interface EmbeddedMapProps {
  query: Query;
  filters: esFilters.Filter[];
}

export const EmbeddedMap = React.memo<EmbeddedMapProps>(({ filters, query }) => {
  const [embeddable, setEmbeddable] = useState<MapEmbeddable | null>(null);

  const factory = start.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);

  const state = {
    layerList: getLayerList(),
    title: i18n.MAP_TITLE,
  };
  const input = {
    id: uuid.v4(),
    filters,
    hidePanelTitles: true,
    query,
    refreshConfig: { value: 0, pause: true },
    viewMode: ViewMode.VIEW,
    isLayerTOCOpen: false,
    hideFilterActions: true,
    mapCenter: { lon: 11, lat: 47, zoom: 0 },
    disableZoom: true,
    disableTooltipControl: true,
    hideToolbarOverlay: true,
    hideWidgetOverlay: true,
  };

  useEffect(() => {
    async function setupEmbeddable() {
      // @ts-ignore
      const embeddableObject = await factory.createFromState(state, input, undefined);

      setEmbeddable(embeddableObject);
    }
    setupEmbeddable();
  }, []);
  const getActions = () => {
    return [];
  };
  return embeddable != null ? (
    <EmbeddablePanel
      data-test-subj="embeddable-panel"
      hideHeader={false}
      embeddable={embeddable}
      // @ts-ignore
      getActions={getActions}
      getEmbeddableFactory={start.getEmbeddableFactory}
      getAllEmbeddableFactories={start.getEmbeddableFactories}
      SavedObjectFinder={SavedObjectFinder}
      inspector={{
        isAvailable: () => false,
        // @ts-ignore
        open: false,
      }}
    />
  ) : null;
});

EmbeddedMap.displayName = 'EmbeddedMap';
