/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { isEqual } from 'lodash';
import {
  Map,
  MapboxOptions,
  NavigationControl,
  Popup,
  GeoJSONSourceOptions
} from 'mapbox-gl';
import { GeoJsonProperties } from 'geojson';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { shade, tint } from 'polished';

interface ChoroplethDataElement {
  key: string;
  value: number;
  [property: string]: any;
}

interface Props {
  style?: React.CSSProperties;
  initialGeojsonSource: NonNullable<GeoJSONSourceOptions['data']>;
  geojsonKeyProperty: string;
  data: ChoroplethDataElement[];
  renderTooltip: (props: {
    geojsonProperties: NonNullable<mapboxgl.MapboxGeoJSONFeature['properties']>;
    data?: ChoroplethDataElement;
  }) => React.ReactElement | null;
  initialMapboxOptions?: Partial<MapboxOptions>;
}

const CHOROPLETH_LAYER_ID = 'choropleth_layer';
const CHOROPLETH_POLYGONS_SOURCE_ID = 'choropleth_polygons';

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

export function getDataRange(data: Props['data']) {
  const firstValue = data[0] ? data[0].value : 0;
  return data.reduce(
    ([min, max], { value }) => [Math.min(min, value), Math.max(max, value)],
    [firstValue, firstValue]
  );
}

export const ChoroplethMap: React.SFC<Props> = props => {
  const {
    style,
    initialGeojsonSource,
    geojsonKeyProperty,
    data,
    renderTooltip: ToolTip,
    initialMapboxOptions
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const popupContainerRef = useRef<HTMLDivElement>(null);
  const enableScrollZoom = useRef(false);
  const [hoverState, setHoverState] = useState<{
    geojsonProperties?: GeoJsonProperties;
    data?: ChoroplethDataElement;
  }>({});
  // props stored in useRefs, used in the initialization side effect
  const initialGeojsonSourceRef = useRef(initialGeojsonSource);
  const initialMapboxOptionsRef = useRef(initialMapboxOptions);

  // converts input data to a scaled value between 0 and 1
  const getValueScale = useCallback(
    (value: number) => {
      const [min, max] = getDataRange(data);
      return (value - min) / (max - min);
    },
    [data]
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
      if (
        map &&
        popupRef.current &&
        data.length &&
        map.getLayer(CHOROPLETH_LAYER_ID)
      ) {
        popupRef.current.setLngLat(event.lngLat);
        const hoverFeatures = map.queryRenderedFeatures(event.point, {
          layers: [CHOROPLETH_LAYER_ID]
        });
        if (hoverFeatures[0]) {
          const geojsonProperties = hoverFeatures[0].properties;
          // only set state when necessary since event fires so often
          if (!isEqual(geojsonProperties, hoverState.geojsonProperties)) {
            const matchedData = data.find(
              ({ key }) =>
                geojsonProperties &&
                key === geojsonProperties[geojsonKeyProperty]
            );
            setHoverState({ geojsonProperties, data: matchedData });
          }
        } else {
          setHoverState({});
        }
      }
    },
    [map, data, hoverState.geojsonProperties, geojsonKeyProperty]
  );

  const updateHoverStateOnMouseout = useCallback(
    (event: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {
      enableScrollZoom.current = false;
      setHoverState({});
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
    if (containerRef.current !== null) {
      // set up Map object
      const mapboxMap = new Map({
        attributionControl: false,
        container: containerRef.current,
        style:
          'https://tiles.maps.elastic.co/styles/osm-bright-desaturated/style.json',
        ...initialMapboxOptionsRef.current
      });
      mapboxMap.dragRotate.disable();
      mapboxMap.touchZoomRotate.disableRotation();
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
          data: initialGeojsonSourceRef.current
        });
        setMap(mapboxMap);
      });

      // cleanup function called when component unmounts
      return () => {
        canvasElement.removeEventListener('wheel', controlScrollZoomOnWheel);
      };
    }
  }, [controlScrollZoomOnWheel]);

  // side effect swaps the old handlers with new ones when they update
  useEffect(() => {
    if (map) {
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
    }
  }, [map, updateHoverStateOnMousemove, updateHoverStateOnMouseout]);

  // side effect replaces choropleth layer with new one on data changes
  useEffect(() => {
    if (map) {
      // find first symbol layer to place new layer in correct order
      const symbolLayer = (map.getStyle().layers || []).find(
        ({ type }) => type === 'symbol'
      );
      if (map.getLayer(CHOROPLETH_LAYER_ID)) {
        map.removeLayer(CHOROPLETH_LAYER_ID);
      }
      if (data.length) {
        map.addLayer(
          {
            id: CHOROPLETH_LAYER_ID,
            type: 'fill',
            source: CHOROPLETH_POLYGONS_SOURCE_ID,
            layout: {},
            paint: {
              'fill-opacity': 0.75,
              'fill-color': data.length
                ? {
                    property: geojsonKeyProperty,
                    stops: data.map(({ key, value }) => [
                      key,
                      getProgressionColor(getValueScale(value))
                    ]),
                    type: 'categorical',
                    default: 'transparent'
                  }
                : 'transparent'
            }
          },
          symbolLayer ? symbolLayer.id : undefined
        );
      }
    }
  }, [map, data, getValueScale, geojsonKeyProperty]);

  // side effect to only render the Popup when hovering a region with data
  useEffect(() => {
    if (popupContainerRef.current && map && popupRef.current) {
      if (hoverState.geojsonProperties && hoverState.data) {
        popupRef.current.setDOMContent(popupContainerRef.current).addTo(map);
        if (popupContainerRef.current.parentElement) {
          popupContainerRef.current.parentElement.style.pointerEvents = 'none';
        }
      } else {
        popupRef.current.remove();
      }
    }
  }, [map, hoverState]);

  // render map container and tooltip in a hidden container
  return (
    <>
      <div ref={containerRef} style={{ height: 256, ...style }} />
      <div style={{ display: 'none' }}>
        <div ref={popupContainerRef}>
          <ToolTip
            geojsonProperties={hoverState.geojsonProperties || {}}
            data={hoverState.data}
          />
        </div>
      </div>
    </>
  );
};
