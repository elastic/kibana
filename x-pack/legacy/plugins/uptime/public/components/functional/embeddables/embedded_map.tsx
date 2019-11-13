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
import { MAP_SAVED_OBJECT_TYPE } from '../../../../../maps/common/constants';
import { useKibanaCore } from '../../../lib/kibana_core';

import { MapEmbeddable } from './types';
import { getLayerList } from './map_config';

export interface EmbeddedMapProps {
  query: Query;
  filters: esFilters.Filter[];
  startDate: number;
  endDate: number;
}

export const EmbeddedMap = React.memo<EmbeddedMapProps>(
  ({ endDate, filters, query, startDate }) => {
    const [embeddable, setEmbeddable] = useState<MapEmbeddable | null>(null);

    const core = useKibanaCore();

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
      timeRange: {
        from: new Date(startDate).toISOString(),
        to: new Date(endDate).toISOString(),
      },
      viewMode: ViewMode.VIEW,
      isLayerTOCOpen: false,
      openTOCDetails: [],
      hideFilterActions: true,
      mapCenter: { lon: -1.05469, lat: 15.96133, zoom: 0 },
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
        embeddable={embeddable}
        getActions={getActions}
        getEmbeddableFactory={start.getEmbeddableFactory}
        getAllEmbeddableFactories={start.getEmbeddableFactories}
        notifications={core.notifications}
        overlays={core.overlays}
        inspector={{
          isAvailable: () => false,
          open: () => true,
        }}
        SavedObjectFinder={SavedObjectFinder}
      />
    ) : null;
  }
);

EmbeddedMap.displayName = 'EmbeddedMap';
