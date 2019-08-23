/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback
} from 'react';
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
  mapboxStyle: MapboxOptions['style'];
  geojsonSource: NonNullable<GeoJSONSourceOptions['data']>;
  geojsonKeyProperty: string;
  data: Array<{ key: string; value: number; [property: string]: any }>;
  renderTooltip: (props: {
    geojsonProperties: NonNullable<mapboxgl.MapboxGeoJSONFeature['properties']>;
    data?: Props['data'][0];
  }) => React.ReactElement | null;
  initialMapboxOptions?: Partial<MapboxOptions>;
  mapValueToColor?: (value: number) => string;
  getProgressionColor?: typeof getDefaultProgressionColor;
}

const linearScale = (x: number, range = { min: 0, max: 1 }) =>
  (range.max - range.min) * x + range.min;
const quadradicScale = (x: number, range = { min: 0, max: 1 }) =>
  4 * (range.max - range.min) * (x ** 2 - x) + range.max;

export function getDefaultProgressionColor(scale: number) {
  const hue = quadradicScale(scale, { min: 200, max: 218 });
  const saturation = 55;
  const lightness = Math.round(linearScale(1 - scale, { min: 35, max: 98 }));
  return `hsl(${hue},${saturation}%,${lightness}%)`;
}

function getDefaultMapValueToColor(
  getProgressionColor = getDefaultProgressionColor,
  data: Props['data']
) {
  return (value: number) => {
    const firstValue = data[0] ? data[0].value : 0;
    const { min, max } = data.reduce(
      ({ min, max }, { value }) => ({
        min: Math.min(min, value),
        max: Math.max(max, value)
      }),
      { min: firstValue, max: firstValue }
    );
    const scale = (value - min) / (max - min);
    return getProgressionColor(scale);
  };
}

export const ChoroplethMap: React.SFC<Props> = props => {
  const {
    style,
    mapValueToColor = useMemo(
      () => getDefaultMapValueToColor(props.getProgressionColor, props.data),
      [props.getProgressionColor, props.data]
    ),
    getProgressionColor,
    mapboxStyle = 'https://tiles.maps.elastic.co/styles/osm-bright/style.json',
    geojsonSource,
    geojsonKeyProperty,
    data,
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
  const mapValueToColorRef = useRef(mapValueToColor);
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
                mapValueToColorRef.current(value)
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

  const onMouseMove = useCallback(
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
    },
    []
  );

  const onMouseOut = useCallback(() => {
    hoveredFeaturePropertiesRef.current = null;
    setHoveredFeatureProperties(null);
    setHoveredData(undefined);
  }, []);

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
      map.on('mousemove', onMouseMove);
      map.on('mouseout', onMouseOut);
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
    mapValueToColorRef.current = mapValueToColor;
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
    geojsonSource,
    geojsonKeyProperty,
    data,
    mapValueToColor,
    getProgressionColor
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
