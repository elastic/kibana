/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo
} from 'react';
import { Map, NavigationControl, Popup } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { shade, tint } from 'polished';
import { ChoroplethToolTip } from './ChoroplethToolTip';

interface ChoroplethItem {
  key: string;
  value: number;
  docCount: number;
}

interface Tooltip {
  name: string;
  value: number;
  docCount: number;
}

interface WorldCountryFeatureProperties {
  name: string;
  iso2: string;
  iso3: string;
}

interface Props {
  items: ChoroplethItem[];
}

const CHOROPLETH_LAYER_ID = 'choropleth_layer';
const CHOROPLETH_POLYGONS_SOURCE_ID = 'choropleth_polygons';
const GEOJSON_KEY_PROPERTY = 'iso2';
const MAPBOX_STYLE =
  'https://tiles.maps.elastic.co/styles/osm-bright-desaturated/style.json';
const GEOJSON_SOURCE =
  'https://vector.maps.elastic.co/files/world_countries_v1.geo.json?elastic_tile_service_tos=agree&my_app_name=ems-landing&my_app_version=7.2.0';

export function getProgressionColor(scale: number) {
  const baseColor = euiLightVars.euiColorPrimary;
  const adjustedScale = 0.75 * scale + 0.05; // prevents pure black & white as min/max colors.
  if (adjustedScale < 0.5) {
    return tint(adjustedScale * 2, baseColor);
  }
  if (adjustedScale > 0.5) {
    return shade(1 - (adjustedScale - 0.5) * 2, baseColor);
  }
  return baseColor;
}

const getMin = (items: ChoroplethItem[]) =>
  Math.min(...items.map(item => item.value));

const getMax = (items: ChoroplethItem[]) =>
  Math.max(...items.map(item => item.value));

export const ChoroplethMap: React.FC<Props> = props => {
  const { items } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const popupContainerRef = useRef<HTMLDivElement>(null);
  const [tooltipState, setTooltipState] = useState<Tooltip | null>(null);
  const [min, max] = useMemo(() => [getMin(items), getMax(items)], [items]);

  // converts an item value to a scaled value between 0 and 1
  const getValueScale = useCallback(
    (value: number) => (value - min) / (max - min),
    [max, min]
  );

  const controlScrollZoomOnWheel = useCallback((event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
    } else {
      event.stopPropagation();
    }
  }, []);

  // side effect creates a new mouseover handler referencing new component state
  // and replaces the old one stored in `updateTooltipStateOnMousemoveRef`
  useEffect(() => {
    const updateTooltipStateOnMousemove = (event: mapboxgl.MapMouseEvent) => {
      const isMapQueryable =
        map &&
        popupRef.current &&
        items.length &&
        map.getLayer(CHOROPLETH_LAYER_ID);

      if (!isMapQueryable) {
        return;
      }
      (popupRef.current as Popup).setLngLat(event.lngLat);
      const hoverFeatures = (map as Map).queryRenderedFeatures(event.point, {
        layers: [CHOROPLETH_LAYER_ID]
      });

      if (tooltipState && hoverFeatures.length === 0) {
        return setTooltipState(null);
      }

      const featureProperties = hoverFeatures[0]
        .properties as WorldCountryFeatureProperties;

      if (tooltipState && tooltipState.name === featureProperties.name) {
        return;
      }

      const item = items.find(
        ({ key }) =>
          featureProperties && key === featureProperties[GEOJSON_KEY_PROPERTY]
      );

      if (item) {
        return setTooltipState({
          name: featureProperties.name,
          value: item.value,
          docCount: item.docCount
        });
      }

      setTooltipState(null);
    };
    updateTooltipStateOnMousemoveRef.current = updateTooltipStateOnMousemove;
  }, [map, items, tooltipState]);

  const updateTooltipStateOnMousemoveRef = useRef(
    (event: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {}
  );

  // initialization side effect, only runs once
  useEffect(() => {
    if (containerRef.current === null) {
      return;
    }

    // set up Map object
    const mapboxMap = new Map({
      attributionControl: false,
      container: containerRef.current,
      dragRotate: false,
      touchZoomRotate: false,
      zoom: 0.85,
      center: { lng: 0, lat: 30 },
      style: MAPBOX_STYLE
    });

    mapboxMap.addControl(
      new NavigationControl({ showCompass: false }),
      'top-left'
    );

    // set up Popup object
    popupRef.current = new Popup({
      closeButton: false,
      closeOnClick: false
    });

    // always use the current handler which changes with component state
    mapboxMap.on('mousemove', (...args) =>
      updateTooltipStateOnMousemoveRef.current(...args)
    );
    mapboxMap.on('mouseout', () => {
      setTooltipState(null);
    });

    // only scroll zoom when key is pressed
    const canvasElement = mapboxMap.getCanvas();
    canvasElement.addEventListener('wheel', controlScrollZoomOnWheel);

    mapboxMap.on('load', () => {
      mapboxMap.addSource(CHOROPLETH_POLYGONS_SOURCE_ID, {
        type: 'geojson',
        data: GEOJSON_SOURCE
      });
      setMap(mapboxMap);
    });

    // cleanup function called when component unmounts
    return () => {
      canvasElement.removeEventListener('wheel', controlScrollZoomOnWheel);
    };
  }, [controlScrollZoomOnWheel]);

  // side effect replaces choropleth layer with new one on items changes
  useEffect(() => {
    if (!map) {
      return;
    }

    // find first symbol layer to place new layer in correct order
    const symbolLayer = (map.getStyle().layers || []).find(
      ({ type }) => type === 'symbol'
    );

    if (map.getLayer(CHOROPLETH_LAYER_ID)) {
      map.removeLayer(CHOROPLETH_LAYER_ID);
    }

    if (items.length === 0) {
      return;
    }

    const stops = items.map(({ key, value }) => [
      key,
      getProgressionColor(getValueScale(value))
    ]);

    const fillColor: mapboxgl.FillPaint['fill-color'] = {
      property: GEOJSON_KEY_PROPERTY,
      stops,
      type: 'categorical',
      default: 'transparent'
    };

    map.addLayer(
      {
        id: CHOROPLETH_LAYER_ID,
        type: 'fill',
        source: CHOROPLETH_POLYGONS_SOURCE_ID,
        layout: {},
        paint: {
          'fill-opacity': 0.75,
          'fill-color': fillColor
        }
      },
      symbolLayer ? symbolLayer.id : undefined
    );
  }, [map, items, getValueScale]);

  // side effect to only render the Popup when hovering a region with a matching item
  useEffect(() => {
    if (!(popupContainerRef.current && map && popupRef.current)) {
      return;
    }
    if (tooltipState) {
      popupRef.current.setDOMContent(popupContainerRef.current).addTo(map);
      if (popupContainerRef.current.parentElement) {
        popupContainerRef.current.parentElement.style.pointerEvents = 'none';
      }
    } else {
      popupRef.current.remove();
    }
  }, [map, tooltipState]);

  // render map container and tooltip in a hidden container
  return (
    <div>
      <div ref={containerRef} style={{ height: 256 }} />
      <div style={{ display: 'none' }}>
        <div ref={popupContainerRef}>
          {tooltipState ? <ChoroplethToolTip {...tooltipState} /> : null}
        </div>
      </div>
    </div>
  );
};
