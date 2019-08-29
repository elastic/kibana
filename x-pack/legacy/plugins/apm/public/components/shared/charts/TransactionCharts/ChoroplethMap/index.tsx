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
import { GeoJsonProperties } from 'geojson';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { shade, tint } from 'polished';
import { Legend } from './Legend';
import { ChoroplethToolTip } from './ChoroplethToolTip';

interface ChoroplethDataElement {
  key: string;
  value: number;
  doc_count: any;
}

interface Tooltip {
  name: string;
  value: number;
  doc_count: number;
}

interface Props {
  data: ChoroplethDataElement[];
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

const getMin = (items: ChoroplethDataElement[]) =>
  Math.min(...items.map(item => item.value));

const getMax = (items: ChoroplethDataElement[]) =>
  Math.max(...items.map(item => item.value));

export const ChoroplethMap: React.SFC<Props> = props => {
  const { data } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const popupContainerRef = useRef<HTMLDivElement>(null);
  const enableScrollZoom = useRef(false);
  const [tooltipState, setTooltipState] = useState<Tooltip | null>(null);
  const [min, max] = useMemo(() => [getMin(data) || 0, getMax(data)] || 0, [
    data
  ]);

  // converts input data to a scaled value between 0 and 1
  const getValueScale = useCallback(
    (value: number) => (min - max !== 0 ? (value - min) / (max - min) : 0),
    [max, min]
  );

  const controlScrollZoomOnWheel = useCallback((event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
    } else {
      event.stopPropagation();
    }
  }, []);

  const updateHoverStateOnMousemove = useCallback(
    (event: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {
      const isMapQueryable =
        map &&
        popupRef.current &&
        data.length &&
        map.getLayer(CHOROPLETH_LAYER_ID);

      if (!isMapQueryable) {
        return;
      }
      (popupRef.current as Popup).setLngLat(event.lngLat);
      const hoverFeatures = (map as Map).queryRenderedFeatures(event.point, {
        layers: [CHOROPLETH_LAYER_ID]
      });

      if (!hoverFeatures[0]) {
        return setTooltipState(null);
      }

      const geojsonProperties = hoverFeatures[0].properties as NonNullable<
        GeoJsonProperties
      >;

      if (tooltipState && tooltipState.name === geojsonProperties.name) {
        return;
      }

      const item = data.find(
        ({ key }) =>
          geojsonProperties && key === geojsonProperties[GEOJSON_KEY_PROPERTY]
      );
      if (item)
        setTooltipState({
          name: geojsonProperties.name,
          value: item.value,
          doc_count: item.doc_count
        });
    },
    [map, data, tooltipState]
  );

  const updateHoverStateOnMouseout = useCallback(
    (event: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {
      enableScrollZoom.current = false;
      setTooltipState(null);
    },
    []
  );

  // When new, memoized handlers are created with useCallback,
  // these references allow the old handlers to be removed
  const updateHoverStateOnMousemoveRef = useRef<
    ((event: mapboxgl.MapMouseEvent & mapboxgl.EventData) => void) | null
  >(null);

  const updateHoverStateOnMouseoutRef = useRef<
    ((event: mapboxgl.MapMouseEvent & mapboxgl.EventData) => void) | null
  >(null);

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

  // side effect swaps the old handlers with new ones when they update
  useEffect(() => {
    if (!map) {
      return;
    }
    if (
      updateHoverStateOnMousemoveRef.current &&
      updateHoverStateOnMouseoutRef.current
    ) {
      map.off('mousemove', updateHoverStateOnMousemoveRef.current);
      map.off('mouseout', updateHoverStateOnMouseoutRef.current);
    }
    map.on('mousemove', updateHoverStateOnMousemove);
    map.on('mouseout', updateHoverStateOnMouseout);
    updateHoverStateOnMousemoveRef.current = updateHoverStateOnMousemove;
    updateHoverStateOnMouseoutRef.current = updateHoverStateOnMouseout;
  }, [map, updateHoverStateOnMousemove, updateHoverStateOnMouseout]);

  // side effect replaces choropleth layer with new one on data changes
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

    if (data.length === 0) {
      return;
    }

    const stops = data.map(({ key, value }) => [
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
  }, [map, data, getValueScale]);

  // side effect to only render the Popup when hovering a region with data
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
          <ChoroplethToolTip {...tooltipState} />
        </div>
      </div>
      <Legend getColorStyle={getProgressionColor} min={min} max={max} />
    </div>
  );
};
