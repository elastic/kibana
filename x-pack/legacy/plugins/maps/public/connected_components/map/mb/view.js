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
  addSpritesheetToMap,
} from './utils';
import { getGlyphUrl, isRetina } from '../../../meta';
import { DECIMAL_DEGREES_PRECISION, ZOOM_PRECISION } from '../../../../common/constants';
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
    mbMap: undefined,
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

  componentDidMount() {
    this._initializeMap();
    this._isMounted = true;
  }

  componentDidUpdate() {
    if (this.state.mbMap) {
      // do not debounce syncing of map-state
      this._syncMbMapWithMapState();
      this._debouncedSync();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this._checker) {
      this._checker.destroy();
    }
    if (this.state.mbMap) {
      this.state.mbMap.remove();
      this.state.mbMap = null;
    }
    this.props.onMapDestroyed();
  }

  _debouncedSync = _.debounce(() => {
    if (this._isMounted) {
      if (!this.state.hasSyncedLayerList) {
        this.setState(
          {
            hasSyncedLayerList: true,
          },
          () => {
            this._syncMbMapWithLayerList();
            this._syncMbMapWithInspector();
          }
        );
      }
    }
  }, 256);

  _getMapState() {
    const zoom = this.state.mbMap.getZoom();
    const mbCenter = this.state.mbMap.getCenter();
    const mbBounds = this.state.mbMap.getBounds();
    return {
      zoom: _.round(zoom, ZOOM_PRECISION),
      center: {
        lon: _.round(mbCenter.lng, DECIMAL_DEGREES_PRECISION),
        lat: _.round(mbCenter.lat, DECIMAL_DEGREES_PRECISION),
      },
      extent: {
        minLon: _.round(mbBounds.getWest(), DECIMAL_DEGREES_PRECISION),
        minLat: _.round(mbBounds.getSouth(), DECIMAL_DEGREES_PRECISION),
        maxLon: _.round(mbBounds.getEast(), DECIMAL_DEGREES_PRECISION),
        maxLat: _.round(mbBounds.getNorth(), DECIMAL_DEGREES_PRECISION),
      },
    };
  }

  async _createMbMapInstance() {
    const initialView = this.props.goto ? this.props.goto.center : null;
    return new Promise(resolve => {
      const mbStyle = {
        version: 8,
        sources: {},
        layers: [],
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
        preserveDrawingBuffer: chrome.getInjected('preserveDrawingBuffer', false),
      };
      if (initialView) {
        options.zoom = initialView.zoom;
        options.center = {
          lng: initialView.lon,
          lat: initialView.lat,
        };
      }
      const mbMap = new mapboxgl.Map(options);
      mbMap.dragRotate.disable();
      mbMap.touchZoomRotate.disableRotation();
      mbMap.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left');

      let emptyImage;
      mbMap.on('styleimagemissing', e => {
        if (emptyImage) {
          mbMap.addImage(e.id, emptyImage);
        }
      });
      mbMap.on('load', () => {
        emptyImage = new Image();
        emptyImage.src =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQYV2NgAAIAAAUAAarVyFEAAAAASUVORK5CYII=';
        emptyImage.crossOrigin = 'anonymous';
        resolve(mbMap);
      });
    });
  }

  async _initializeMap() {
    let mbMap;
    try {
      mbMap = await this._createMbMapInstance();
    } catch (error) {
      this.props.setMapInitError(error.message);
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({ mbMap }, () => {
      this._loadMakiSprites();
      this._initResizerChecker();
      this._registerMapEventListeners();
      this.props.onMapReady(this._getMapState());
    });
  }

  _registerMapEventListeners() {
    // moveend callback is debounced to avoid updating map extent state while map extent is still changing
    // moveend is fired while the map extent is still changing in the following scenarios
    // 1) During opening/closing of layer details panel, the EUI animation results in 8 moveend events
    // 2) Setting map zoom and center from goto is done in 2 API calls, resulting in 2 moveend events
    this.state.mbMap.on(
      'moveend',
      _.debounce(() => {
        this.props.extentChanged(this._getMapState());
      }, 100)
    );

    const throttledSetMouseCoordinates = _.throttle(e => {
      this.props.setMouseCoordinates({
        lat: e.lngLat.lat,
        lon: e.lngLat.lng,
      });
    }, 100);
    this.state.mbMap.on('mousemove', throttledSetMouseCoordinates);
    this.state.mbMap.on('mouseout', () => {
      throttledSetMouseCoordinates.cancel(); // cancel any delayed setMouseCoordinates invocations
      this.props.clearMouseCoordinates();
    });
  }

  _initResizerChecker() {
    this._checker = new ResizeChecker(this.refs.mapContainer);
    this._checker.on('resize', () => {
      this.state.mbMap.resize();
    });
  }

  _loadMakiSprites() {
    const sprites = isRetina() ? sprites2 : sprites1;
    const json = isRetina() ? spritesheet[2] : spritesheet[1];
    addSpritesheetToMap(json, sprites, this.state.mbMap);
  }

  _syncMbMapWithMapState = () => {
    const { isMapReady, goto, clearGoto } = this.props;

    if (!isMapReady || !goto) {
      return;
    }

    clearGoto();

    if (goto.bounds) {
      //clamping ot -89/89 latitudes since Mapboxgl does not seem to handle bounds that contain the poles (logs errors to the console when using -90/90)
      const lnLatBounds = new mapboxgl.LngLatBounds(
        new mapboxgl.LngLat(
          clamp(goto.bounds.min_lon, -180, 180),
          clamp(goto.bounds.min_lat, -89, 89)
        ),
        new mapboxgl.LngLat(
          clamp(goto.bounds.max_lon, -180, 180),
          clamp(goto.bounds.max_lat, -89, 89)
        )
      );
      //maxZoom ensure we're not zooming in too far on single points or small shapes
      //the padding is to avoid too tight of a fit around edges
      this.state.mbMap.fitBounds(lnLatBounds, { maxZoom: 17, padding: 16 });
    } else if (goto.center) {
      this.state.mbMap.setZoom(goto.center.zoom);
      this.state.mbMap.setCenter({
        lng: goto.center.lon,
        lat: goto.center.lat,
      });
    }
  };

  _syncMbMapWithLayerList = () => {
    if (!this.props.isMapReady) {
      return;
    }

    removeOrphanedSourcesAndLayers(this.state.mbMap, this.props.layerList);
    this.props.layerList.forEach(layer => layer.syncLayerWithMB(this.state.mbMap));
    syncLayerOrderForSingleLayer(this.state.mbMap, this.props.layerList);
  };

  _syncMbMapWithInspector = () => {
    if (!this.props.isMapReady || !this.props.inspectorAdapters.map) {
      return;
    }

    const stats = {
      center: this.state.mbMap.getCenter().toArray(),
      zoom: this.state.mbMap.getZoom(),
    };
    this.props.inspectorAdapters.map.setMapState({
      stats,
      style: this.state.mbMap.getStyle(),
    });
  };

  render() {
    let drawControl;
    let tooltipControl;
    if (this.state.mbMap) {
      drawControl = <DrawControl mbMap={this.state.mbMap} addFilters={this.props.addFilters} />;
      tooltipControl = (
        <TooltipControl
          mbMap={this.state.mbMap}
          addFilters={this.props.addFilters}
          geoFields={this.props.geoFields}
          renderTooltipContent={this.props.renderTooltipContent}
        />
      );
    }
    return (
      <div
        id="mapContainer"
        className="mapContainer"
        ref="mapContainer"
        data-test-subj="mapContainer"
      >
        {drawControl}
        {tooltipControl}
      </div>
    );
  }
}

function clamp(val, min, max) {
  if (val > max) val = max;
  else if (val < min) val = min;
  return val;
}
