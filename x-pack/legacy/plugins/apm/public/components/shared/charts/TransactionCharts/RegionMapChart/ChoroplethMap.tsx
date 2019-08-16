/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useRef } from 'react';
import { isEqual } from 'lodash';
import {
  Map,
  MapboxOptions,
  NavigationControl,
  Popup,
  PopupOptions,
  GeoJSONSourceOptions
} from 'mapbox-gl';

interface Props {
  style?: React.CSSProperties;
  getColorStyle: (scale: number) => string;
  mapboxStyle: MapboxOptions['style'];
  geojsonSource: NonNullable<GeoJSONSourceOptions['data']>;
  geojsonKeyProperty: string;
  data: Array<{ key: string; value: number; [property: string]: any }>;
  maxValue: number;
  renderTooltip: (props: {
    geojsonProperties: NonNullable<mapboxgl.MapboxGeoJSONFeature['properties']>;
    data?: Props['data'][0];
  }) => React.ReactElement | null;
  initialMapboxOptions?: Partial<MapboxOptions>;
}
export const ChoroplethMap: React.SFC<Props> = props => {
  const {
    style,
    getColorStyle,
    mapboxStyle = 'https://tiles.maps.elastic.co/styles/osm-bright/style.json',
    geojsonSource,
    geojsonKeyProperty,
    data,
    maxValue,
    renderTooltip: ToolTip
  } = props;

  const [hoveredData, setHoveredData] = useState<Props['data'][0] | undefined>(
    undefined
  );
  const [hoveredFeatureProperties, setHoveredFeatureProperties] = useState<
    mapboxgl.MapboxGeoJSONFeature['properties']
  >(null);
  const hoveredFeaturePropertiesRef = useRef<
    mapboxgl.MapboxGeoJSONFeature['properties']
  >(null);
  const isMapReady = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toolTipRef = useRef<HTMLDivElement>(null);
  const mapboxMap = useRef<Map | null>(null);
  const mapboxPopup = useRef<Popup | null>(null);
  const mapboxStyleRef = useRef(mapboxStyle);
  const choroplethIncrementingId = useRef(0);
  const choroplethLayerId = useRef('choropleth_regions_0');
  const propsRef = useRef(props);
  propsRef.current = props;

  const updateChoroplethLayer = useRef(() => {
    if (mapboxMap.current && isMapReady.current) {
      const map = mapboxMap.current;
      const currentLayer: mapboxgl.Layer | undefined = map.getLayer(
        choroplethLayerId.current
      );
      if (currentLayer) {
        map.removeLayer(choroplethLayerId.current);
      }
      const symbolLayer = (map.getStyle().layers || []).find(
        ({ type }) => type === 'symbol'
      );
      choroplethIncrementingId.current++;
      choroplethLayerId.current = `choropleth_regions_${choroplethIncrementingId.current}`;
      map.addLayer(
        {
          id: choroplethLayerId.current,
          type: 'fill',
          source: {
            type: 'geojson',
            data: propsRef.current.geojsonSource
          },
          layout: {},
          paint: {
            'fill-opacity': 0.75,
            'fill-color': {
              property: propsRef.current.geojsonKeyProperty,
              stops: propsRef.current.data.map(({ key, value }) => [
                key,
                propsRef.current.getColorStyle(
                  value / propsRef.current.maxValue
                )
              ]),
              type: 'categorical',
              default: 'transparent'
            }
          }
        },
        symbolLayer ? symbolLayer.id : undefined
      );
    }
  });

  const onMouseMove = useRef(
    (event: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {
      if (mapboxMap.current && isMapReady.current && mapboxPopup.current) {
        mapboxPopup.current.setLngLat(event.lngLat);
        const hoverFeatures = mapboxMap.current.queryRenderedFeatures(
          event.point,
          {
            layers: [choroplethLayerId.current]
          }
        );
        const geojsonProperties = hoverFeatures[0]
          ? hoverFeatures[0].properties
          : null;
        if (geojsonProperties) {
          if (
            !isEqual(hoveredFeaturePropertiesRef.current, geojsonProperties)
          ) {
            hoveredFeaturePropertiesRef.current = geojsonProperties;
            setHoveredFeatureProperties(geojsonProperties);
            const matchedData = propsRef.current.data.find(
              ({ key }) =>
                key === geojsonProperties[propsRef.current.geojsonKeyProperty]
            );
            setHoveredData(matchedData);
          }
        } else {
          if (hoveredFeaturePropertiesRef.current) {
            hoveredFeaturePropertiesRef.current = null;
            setHoveredFeatureProperties(null);
            setHoveredData(undefined);
          }
        }
      }
    }
  );

  useEffect(() => {
    if (containerRef.current !== null) {
      const options: MapboxOptions = {
        attributionControl: false,
        container: containerRef.current,
        style: propsRef.current.mapboxStyle,
        ...propsRef.current.initialMapboxOptions
      };
      mapboxMap.current = new Map(options);
      const map = mapboxMap.current;
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      map.addControl(new NavigationControl({ showCompass: false }), 'top-left');
      const popupOptions: PopupOptions = {
        closeButton: false,
        closeOnClick: false
      };
      mapboxPopup.current = new Popup(popupOptions);
      map.on('mousemove', onMouseMove.current);
      map.on('load', () => {
        isMapReady.current = true;
        updateChoroplethLayer.current();
      });
    }
  }, []);

  useEffect(() => {
    if (toolTipRef.current && mapboxMap.current && mapboxPopup.current) {
      if (hoveredFeatureProperties && hoveredData) {
        mapboxPopup.current
          .setDOMContent(toolTipRef.current)
          .addTo(mapboxMap.current);
        if (toolTipRef.current.parentElement) {
          toolTipRef.current.parentElement.style.pointerEvents = 'none';
        }
      } else {
        mapboxPopup.current.remove();
      }
    }
  }, [hoveredFeatureProperties, hoveredData]);

  useEffect(() => {
    const map = mapboxMap.current;
    if (map && isMapReady.current) {
      if (isEqual(mapboxStyleRef.current, mapboxStyle)) {
        updateChoroplethLayer.current();
      } else {
        mapboxStyleRef.current = mapboxStyle;
        isMapReady.current = false;
        map.setStyle(mapboxStyle);
        map.once('styledata', () => {
          isMapReady.current = true;
          updateChoroplethLayer.current();
        });
      }
    }
  }, [
    mapboxStyle,
    getColorStyle,
    geojsonSource,
    geojsonKeyProperty,
    data,
    maxValue
  ]);

  return (
    <>
      <div ref={containerRef} style={{ height: 256, ...style }} />
      <div style={{ display: 'none' }}>
        <div ref={toolTipRef}>
          <ToolTip
            geojsonProperties={hoveredFeatureProperties || {}}
            data={hoveredData}
          />
        </div>
      </div>
    </>
  );
};
