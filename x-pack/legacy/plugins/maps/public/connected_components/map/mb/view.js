/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { ResizeChecker } from 'ui/resize_checker';
import {
  syncLayerOrderForSingleLayer,
  removeOrphanedSourcesAndLayers,
  addSpritesheetToMap
} from './utils';
import { getGlyphUrl, isRetina } from '../../../meta';
import {
  DECIMAL_DEGREES_PRECISION,
  ZOOM_PRECISION,
} from '../../../../common/constants';
import mapboxgl from 'mapbox-gl';
import chrome from 'ui/chrome';
import { spritesheet } from '@elastic/maki';
import sprites1 from '@elastic/maki/dist/sprite@1.png';
import sprites2 from '@elastic/maki/dist/sprite@2.png';
import { DrawControl } from './draw_control';
import { TooltipControl } from './tooltip_control';

export class MBMapContainer extends React.Component {

  state = {
    prevLayerList: undefined,
    hasSyncedLayerList: false,
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const nextLayerList = nextProps.layerList;
    if (nextLayerList !== prevState.prevLayerList) {
      return {
        prevLayerList: nextLayerList,
        hasSyncedLayerList: false,

      };
    }

    return null;
  }

  constructor() {
    super();
    this._mbMap = null;
  }

  componentDidUpdate() {
    if (this._mbMap) {
      // do not debounce syncing of map-state
      this._syncMbMapWithMapState();
      this._debouncedSync();
    }
  }

  componentDidMount() {
    this._initializeMap();
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this._checker) {
      this._checker.destroy();
    }
    if (this._mbMap) {
      this._mbMap.remove();
      this._mbMap = null;
    }
    this.props.onMapDestroyed();
  }

  _debouncedSync = _.debounce(() => {
    if (this._isMounted) {
      if (!this.state.hasSyncedLayerList) {
        this.setState({
          hasSyncedLayerList: true
        }, () => {
          this._syncMbMapWithLayerList();
          this._syncMbMapWithInspector();
        });
      }
    }
  }, 256);

  _getMapState() {
    const zoom = this._mbMap.getZoom();
    const mbCenter = this._mbMap.getCenter();
    const mbBounds = this._mbMap.getBounds();
    return {
      zoom: _.round(zoom, ZOOM_PRECISION),
      center: {
        lon: _.round(mbCenter.lng, DECIMAL_DEGREES_PRECISION),
        lat: _.round(mbCenter.lat, DECIMAL_DEGREES_PRECISION)
      },
      extent: {
        minLon: _.round(mbBounds.getWest(), DECIMAL_DEGREES_PRECISION),
        minLat: _.round(mbBounds.getSouth(), DECIMAL_DEGREES_PRECISION),
        maxLon: _.round(mbBounds.getEast(), DECIMAL_DEGREES_PRECISION),
        maxLat: _.round(mbBounds.getNorth(), DECIMAL_DEGREES_PRECISION)
      }
    };
  }

  async _createMbMapInstance() {
    const initialView = this.props.goto ? this.props.goto.center : null;
    return new Promise((resolve) => {

      const mbStyle = {
        version: 8,
        sources: {},
        layers: []
      };
      const glyphUrl = getGlyphUrl();
      if (glyphUrl) {
        mbStyle.glyphs = glyphUrl;
      }

      const options = {
        attributionControl: false,
        container: this.refs.mapContainer,
        style: mbStyle,
        scrollZoom: this.props.scrollZoom,
        preserveDrawingBuffer: chrome.getInjected('preserveDrawingBuffer', false)
      };
      if (initialView) {
        options.zoom = initialView.zoom;
        options.center = {
          lng: initialView.lon,
          lat: initialView.lat
        };
      }
      const mbMap = new mapboxgl.Map(options);
      mbMap.dragRotate.disable();
      mbMap.touchZoomRotate.disableRotation();
      mbMap.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }), 'top-left'
      );

      let emptyImage;
      mbMap.on('styleimagemissing', (e) => {
        if (emptyImage) {
          mbMap.addImage(e.id, emptyImage);
        }
      });
      mbMap.on('load', () => {
        emptyImage = new Image();
        // eslint-disable-next-line max-len
        emptyImage.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQYV2NgAAIAAAUAAarVyFEAAAAASUVORK5CYII=';
        emptyImage.crossOrigin = 'anonymous';
        resolve(mbMap);
      });
    });
  }

  async _initializeMap() {
    try {
      this._mbMap = await this._createMbMapInstance();
    } catch(error) {
      this.props.setMapInitError(error.message);
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this._loadMakiSprites();

    this._initResizerChecker();

    // moveend callback is debounced to avoid updating map extent state while map extent is still changing
    // moveend is fired while the map extent is still changing in the following scenarios
    // 1) During opening/closing of layer details panel, the EUI animation results in 8 moveend events
    // 2) Setting map zoom and center from goto is done in 2 API calls, resulting in 2 moveend events
    this._mbMap.on('moveend', _.debounce(() => {
      this.props.extentChanged(this._getMapState());
    }, 100));

    const throttledSetMouseCoordinates = _.throttle(e => {
      this.props.setMouseCoordinates({
        lat: e.lngLat.lat,
        lon: e.lngLat.lng
      });
    }, 100);
    this._mbMap.on('mousemove', throttledSetMouseCoordinates);
    this._mbMap.on('mouseout', () => {
      throttledSetMouseCoordinates.cancel(); // cancel any delayed setMouseCoordinates invocations
      this.props.clearMouseCoordinates();
    });

    this.props.onMapReady(this._getMapState());
  }

  _initResizerChecker() {
    this._checker = new ResizeChecker(this.refs.mapContainer);
    this._checker.on('resize', () => {
      this._mbMap.resize();
    });
  }

  _loadMakiSprites() {
    const sprites = isRetina() ? sprites2 : sprites1;
    const json = isRetina() ? spritesheet[2] : spritesheet[1];
    addSpritesheetToMap(json, sprites, this._mbMap);
  }

  _syncMbMapWithMapState = () => {
    const {
      isMapReady,
      goto,
      clearGoto,
    } = this.props;

    if (!isMapReady || !goto) {
      return;
    }

    clearGoto();

    if (goto.bounds) {
      //clamping ot -89/89 latitudes since Mapboxgl does not seem to handle bounds that contain the poles (logs errors to the console when using -90/90)
      const lnLatBounds = new mapboxgl.LngLatBounds(
        new mapboxgl.LngLat(clamp(goto.bounds.min_lon, -180, 180), clamp(goto.bounds.min_lat, -89, 89)),
        new mapboxgl.LngLat(clamp(goto.bounds.max_lon, -180, 180), clamp(goto.bounds.max_lat, -89, 89)),
      );
      //maxZoom ensure we're not zooming in too far on single points or small shapes
      //the padding is to avoid too tight of a fit around edges
      this._mbMap.fitBounds(lnLatBounds, { maxZoom: 17, padding: 16 });
    } else if (goto.center) {
      this._mbMap.setZoom(goto.center.zoom);
      this._mbMap.setCenter({
        lng: goto.center.lon,
        lat: goto.center.lat
      });
    }
  };

  _syncMbMapWithLayerList = () => {
    if (!this.props.isMapReady) {
      return;
    }

    removeOrphanedSourcesAndLayers(this._mbMap, this.props.layerList);
    this.props.layerList.forEach(layer => layer.syncLayerWithMB(this._mbMap));
    syncLayerOrderForSingleLayer(this._mbMap, this.props.layerList);
  };

  _syncMbMapWithInspector = () => {
    if (!this.props.isMapReady || !this.props.inspectorAdapters.map) {
      return;
    }

    const stats = {
      center: this._mbMap.getCenter().toArray(),
      zoom: this._mbMap.getZoom(),

    };
    this.props.inspectorAdapters.map.setMapState({
      stats,
      style: this._mbMap.getStyle(),
    });
  };

  render() {
    return (
      <div
        id="mapContainer"
        className="mapContainer"
        ref="mapContainer"
        data-test-subj="mapContainer"
      >
        <DrawControl
          mbMap={this._mbMap}
          addFilters={this.props.addFilters}
        />
        <TooltipControl
          mbMap={this._mbMap}
          addFilters={this.props.addFilters}
          geoFields={this.props.geoFields}
        />
      </div>
    );
  }
}

function clamp(val, min, max) {
  if (val > max) val = max;
  else if (val < min) val = min;
  return val;
}
