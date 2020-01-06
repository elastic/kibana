/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, useContext } from 'react';
import uuid from 'uuid';
import styled from 'styled-components';

import { start } from '../../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import * as i18n from './translations';
// @ts-ignore
import { MAP_SAVED_OBJECT_TYPE } from '../../../../../../maps/common/constants';

import { MapEmbeddable } from './types';
import { getLayerList } from './map_config';
import { UptimeSettingsContext } from '../../../../contexts';

export interface EmbeddedMapProps {
  upPoints: LocationPoint[];
  downPoints: LocationPoint[];
}

export interface LocationPoint {
  lat: string;
  lon: string;
}

const EmbeddedPanel = styled.div`
  z-index: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  .embPanel__content {
    display: flex;
    flex: 1 1 100%;
    z-index: 1;
    min-height: 0; /* Absolute must for Firefox to scroll contents */
  }
  &&& .mapboxgl-canvas {
    animation: none !important;
  }
`;

export const EmbeddedMap = ({ upPoints, downPoints }: EmbeddedMapProps) => {
  const { colors } = useContext(UptimeSettingsContext);
  const [embeddable, setEmbeddable] = useState<MapEmbeddable>();
  const embeddableRoot: React.RefObject<HTMLDivElement> = React.createRef();
  const factory = start.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);

  const input = {
    id: uuid.v4(),
    filters: [],
    hidePanelTitles: true,
    query: { query: '', language: 'kuery' },
    refreshConfig: { value: 0, pause: false },
    viewMode: 'view',
    isLayerTOCOpen: false,
    hideFilterActions: true,
    mapCenter: { lon: 11, lat: 20, zoom: 0 },
    disableInteractive: true,
    disableTooltipControl: true,
    hideToolbarOverlay: true,
    hideLayerControl: true,
    hideViewControl: true,
  };

  useEffect(() => {
    async function setupEmbeddable() {
      const mapState = {
        layerList: getLayerList(upPoints, downPoints, colors),
        title: i18n.MAP_TITLE,
      };
      // @ts-ignore
      const embeddableObject = await factory.createFromState(mapState, input, undefined);

      setEmbeddable(embeddableObject);
    }
    setupEmbeddable();
    // we want this effect to execute exactly once after the component mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (embeddable) {
      embeddable.setLayerList(getLayerList(upPoints, downPoints, colors));
    }
  }, [upPoints, downPoints, embeddable, colors]);

  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
  }, [embeddable, embeddableRoot]);

  return (
    <EmbeddedPanel>
      <div className="embPanel__content" ref={embeddableRoot} />
    </EmbeddedPanel>
  );
};

EmbeddedMap.displayName = 'EmbeddedMap';
