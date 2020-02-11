/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { ResizeChecker } from '../../../../../../../../src/plugins/kibana_utils/public';
import {
  syncLayerOrderForSingleLayer,
  removeOrphanedSourcesAndLayers,
  addSpritesheetToMap,
} from './utils';
import { getGlyphUrl, isRetina } from '../../../meta';
import { DECIMAL_DEGREES_PRECISION, ZOOM_PRECISION } from '../../../../common/constants';
import mapboxgl from 'mapbox-gl/dist/mapbox-gl-csp';
import mbWorkerUrl from '!!file-loader!mapbox-gl/dist/mapbox-gl-csp-worker';
import mbRtlPlugin from '!!file-loader!@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min.js';
import chrome from 'ui/chrome';
import { spritesheet } from '@elastic/maki';
import sprites1 from '@elastic/maki/dist/sprite@1.png';
import sprites2 from '@elastic/maki/dist/sprite@2.png';
import { DrawControl } from './draw_control';
import { TooltipControl } from './tooltip_control';

mapboxgl.workerUrl = mbWorkerUrl;
mapboxgl.setRTLTextPlugin(mbRtlPlugin);

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
        interactive: !this.props.disableInteractive,
      };
      const initialView = _.get(this.props.goto, 'center');
      if (initialView) {
        options.zoom = initialView.zoom;
        options.center = {
          lng: initialView.lon,
          lat: initialView.lat,
        };
      } else {
        options.bounds = [-170, -60, 170, 75];
      }
      const mbMap = new mapboxgl.Map(options);
      mbMap.dragRotate.disable();
      mbMap.touchZoomRotate.disableRotation();
      if (!this.props.disableInteractive) {
        mbMap.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left');
      }

      const hatchImageBase64 =
        'data:image/png;base64,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';
        // 'data:image/png;base64,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';

      const hatchImage = new Image();
      hatchImage.onload = () => {
        mbMap.addImage('__kbn_too_many_features__', hatchImage);
      };
      hatchImage.src = hatchImageBase64;



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
    // Attach event only if view control is visible, which shows lat/lon
    if (!this.props.hideViewControl) {
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
      tooltipControl = !this.props.disableTooltipControl ? (
        <TooltipControl
          mbMap={this.state.mbMap}
          addFilters={this.props.addFilters}
          geoFields={this.props.geoFields}
          renderTooltipContent={this.props.renderTooltipContent}
        />
      ) : null;
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
