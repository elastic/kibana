/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { ResizeChecker } from 'ui/resize_checker';
import { I18nProvider } from '@kbn/i18n/react';
import {
  syncLayerOrderForSingleLayer,
  removeOrphanedSourcesAndLayers,
  addSpritesheetToMap
} from './utils';
import { getGlyphUrl, isRetina } from '../../../meta';
import {
  DECIMAL_DEGREES_PRECISION,
  FEATURE_ID_PROPERTY_NAME,
  ZOOM_PRECISION,
  LON_INDEX,
  DRAW_TYPE
} from '../../../../common/constants';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw-unminified';
import DrawRectangle from 'mapbox-gl-draw-rectangle-mode';
import { FeatureTooltip } from '../feature_tooltip';
import {
  createSpatialFilterWithBoundingBox,
  createSpatialFilterWithGeometry,
  getBoundingBoxGeometry,
  roundCoordinates
} from '../../../elasticsearch_geo_utils';
import chrome from 'ui/chrome';
import { spritesheet } from '@elastic/maki';
import sprites1 from '@elastic/maki/dist/sprite@1.png';
import sprites2 from '@elastic/maki/dist/sprite@2.png';
import { DrawTooltip } from './draw_tooltip';

const mbDrawModes = MapboxDraw.modes;
mbDrawModes.draw_rectangle = DrawRectangle;

const TOOLTIP_TYPE = {
  HOVER: 'HOVER',
  LOCKED: 'LOCKED'
};

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
    this._tooltipContainer = document.createElement('div');
    this._mbPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '260px', // width of table columns max-widths plus all padding
    });
    this._mbDrawControl = new MapboxDraw({
      displayControlsDefault: false,
      modes: mbDrawModes
    });
    this._mbDrawControlAdded = false;
  }

  _onTooltipClose = () => {
    this.props.setTooltipState(null);
  };

  _onDraw = (e) => {
    if (!e.features.length) {
      return;
    }

    const isBoundingBox = this.props.drawState.drawType === DRAW_TYPE.BOUNDS;
    const geometry = e.features[0].geometry;
    // MapboxDraw returns coordinates with 12 decimals. Round to a more reasonable number
    roundCoordinates(geometry.coordinates);

    try {
      const options = {
        indexPatternId: this.props.drawState.indexPatternId,
        geoFieldName: this.props.drawState.geoFieldName,
        geoFieldType: this.props.drawState.geoFieldType,
        geometryLabel: this.props.drawState.geometryLabel,
        relation: this.props.drawState.relation,
      };
      const filter = isBoundingBox
        ? createSpatialFilterWithBoundingBox({
          ...options,
          geometry: getBoundingBoxGeometry(geometry)
        })
        : createSpatialFilterWithGeometry({
          ...options,
          geometry
        });
      this.props.addFilters([filter]);
    } catch (error) {
      // TODO notify user why filter was not created
      console.error(error);
    } finally {
      this.props.disableDrawState();
    }
  };

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
      this._syncDrawControl();
    }
  }, 256);

  _getIdsForFeatures(mbFeatures) {
    const uniqueFeatures = [];
    //there may be duplicates in the results from mapbox
    //this is because mapbox returns the results per tile
    //for polygons or lines, it might return multiple features, one for each tile
    for (let i = 0; i < mbFeatures.length; i++) {
      const mbFeature = mbFeatures[i];
      const layer = this._getLayerByMbLayerId(mbFeature.layer.id);
      const featureId = mbFeature.properties[FEATURE_ID_PROPERTY_NAME];
      const layerId = layer.getId();
      let match = false;
      for (let j = 0; j < uniqueFeatures.length; j++) {
        const uniqueFeature = uniqueFeatures[j];
        if (featureId === uniqueFeature.id && layerId === uniqueFeature.layerId) {
          match = true;
          break;
        }
      }
      if (!match) {
        uniqueFeatures.push({
          id: featureId,
          layerId: layerId,
          geometry: mbFeature.geometry,
        });
      }
    }
    return uniqueFeatures;
  }

  _lockTooltip =  (e) => {

    if (this.props.isDrawingFilter) {
      //ignore click events when in draw mode
      return;
    }

    this._updateHoverTooltipState.cancel();//ignore any possible moves

    const mbFeatures = this._getFeaturesUnderPointer(e.point);
    if (!mbFeatures.length) {
      this.props.setTooltipState(null);
      return;
    }

    const targetMbFeataure = mbFeatures[0];
    const popupAnchorLocation = this._justifyAnchorLocation(e.lngLat, targetMbFeataure);

    const features = this._getIdsForFeatures(mbFeatures);
    this.props.setTooltipState({
      type: TOOLTIP_TYPE.LOCKED,
      features: features,
      location: popupAnchorLocation
    });
  };

  _updateHoverTooltipState = _.debounce((e) => {

    if (this.props.isDrawingFilter) {
      //ignore hover events when in draw mode
      return;
    }

    if (this.props.tooltipState && this.props.tooltipState.type === TOOLTIP_TYPE.LOCKED) {
      //ignore hover events when tooltip is locked
      return;
    }

    const mbFeatures = this._getFeaturesUnderPointer(e.point);
    if (!mbFeatures.length) {
      this.props.setTooltipState(null);
      return;
    }

    const targetMbFeature = mbFeatures[0];
    if (this.props.tooltipState) {
      const firstFeature = this.props.tooltipState.features[0];
      if (targetMbFeature.properties[FEATURE_ID_PROPERTY_NAME] === firstFeature.id) {
        return;
      }
    }

    const popupAnchorLocation = this._justifyAnchorLocation(e.lngLat, targetMbFeature);
    const features = this._getIdsForFeatures(mbFeatures);
    this.props.setTooltipState({
      type: TOOLTIP_TYPE.HOVER,
      features: features,
      location: popupAnchorLocation
    });

  }, 100);


  _justifyAnchorLocation(mbLngLat, targetFeature) {
    let popupAnchorLocation = [mbLngLat.lng, mbLngLat.lat]; // default popup location to mouse location
    if (targetFeature.geometry.type === 'Point') {
      const coordinates = targetFeature.geometry.coordinates.slice();

      // Ensure that if the map is zoomed out such that multiple
      // copies of the feature are visible, the popup appears
      // over the copy being pointed to.
      while (Math.abs(mbLngLat.lng - coordinates[LON_INDEX]) > 180) {
        coordinates[0] += mbLngLat.lng > coordinates[LON_INDEX] ? 360 : -360;
      }

      popupAnchorLocation = coordinates;
    }
    return popupAnchorLocation;
  }
  _getMbLayerIdsForTooltips() {

    const mbLayerIds = this.props.layerList.reduce((mbLayerIds, layer) => {
      return layer.canShowTooltip() ? mbLayerIds.concat(layer.getMbLayerIds()) : mbLayerIds;
    }, []);


    //Ensure that all layers are actually on the map.
    //The raw list may contain layer-ids that have not been added to the map yet.
    //For example:
    //a vector or heatmap layer will not add a source and layer to the mapbox-map, until that data is available.
    //during that data-fetch window, the app should not query for layers that do not exist.
    return mbLayerIds.filter((mbLayerId) => {
      return !!this._mbMap.getLayer(mbLayerId);
    });
  }

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

  _getFeaturesUnderPointer(mbLngLatPoint) {

    if (!this._mbMap) {
      return [];
    }

    const mbLayerIds = this._getMbLayerIdsForTooltips();
    const PADDING = 2;//in pixels
    const mbBbox = [
      {
        x: mbLngLatPoint.x - PADDING,
        y: mbLngLatPoint.y - PADDING
      },
      {
        x: mbLngLatPoint.x + PADDING,
        y: mbLngLatPoint.y + PADDING
      }
    ];
    return this._mbMap.queryRenderedFeatures(mbBbox, { layers: mbLayerIds });
  }

  componentDidUpdate() {
    if (this._mbMap) {
      // do not debounce syncing of map-state and tooltip
      this._syncMbMapWithMapState();
      this._syncTooltipState();
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
      this._tooltipContainer = null;
    }
    this.props.onMapDestroyed();
  }

  _removeDrawControl() {
    if (!this._mbDrawControlAdded) {
      return;
    }

    this._mbMap.getCanvas().style.cursor = '';
    this._mbMap.off('draw.create', this._onDraw);
    this._mbMap.removeControl(this._mbDrawControl);
    this._mbDrawControlAdded = false;
  }

  _updateDrawControl() {
    if (!this._mbDrawControlAdded) {
      this._mbMap.addControl(this._mbDrawControl);
      this._mbDrawControlAdded = true;
      this._mbMap.getCanvas().style.cursor = 'crosshair';
      this._mbMap.on('draw.create', this._onDraw);
    }
    const mbDrawMode = this.props.drawState.drawType === DRAW_TYPE.POLYGON ?
      this._mbDrawControl.modes.DRAW_POLYGON : 'draw_rectangle';
    this._mbDrawControl.changeMode(mbDrawMode);
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

      this._updateHoverTooltipState.cancel();
      if (this.props.tooltipState && this.props.tooltipState.type !== TOOLTIP_TYPE.LOCKED) {
        this.props.setTooltipState(null);
      }
    });

    this._mbMap.on('mousemove', this._updateHoverTooltipState);
    this._mbMap.on('click', this._lockTooltip);

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

  _reevaluateTooltipPosition = () => {
    // Force mapbox to ensure tooltip does not clip map boundary and move anchor when clipping occurs
    requestAnimationFrame(() => {
      if (this._isMounted && this.props.tooltipState && this.props.tooltipState.location) {
        this._mbPopup.setLngLat(this.props.tooltipState.location);
      }
    });
  }

  _hideTooltip() {
    if (this._mbPopup.isOpen()) {
      this._mbPopup.remove();
      ReactDOM.unmountComponentAtNode(this._tooltipContainer);
    }
  }

  _showTooltip() {
    if (!this._isMounted) {
      return;
    }
    const isLocked = this.props.tooltipState.type === TOOLTIP_TYPE.LOCKED;
    ReactDOM.render((
      <I18nProvider>
        <FeatureTooltip
          features={this.props.tooltipState.features}
          anchorLocation={this.props.tooltipState.location}
          loadFeatureProperties={this._loadFeatureProperties}
          findLayerById={this._findLayerById}
          closeTooltip={this._onTooltipClose}
          showFilterButtons={!!this.props.addFilters && isLocked}
          isLocked={isLocked}
          addFilters={this.props.addFilters}
          geoFields={this.props.geoFields}
          reevaluateTooltipPosition={this._reevaluateTooltipPosition}
        />
      </I18nProvider>
    ), this._tooltipContainer);

    this._mbPopup.setLngLat(this.props.tooltipState.location)
      .setDOMContent(this._tooltipContainer)
      .addTo(this._mbMap);
  }

  _loadFeatureProperties = async ({ layerId, featureId }) => {
    const tooltipLayer = this._findLayerById(layerId);
    if (!tooltipLayer) {
      return [];
    }
    const targetFeature = tooltipLayer.getFeatureById(featureId);
    if (!targetFeature) {
      return [];
    }
    return await tooltipLayer.getPropertiesForTooltip(targetFeature.properties);
  };

  _findLayerById = (layerId) => {
    return this.props.layerList.find(layer => {
      return layer.getId() === layerId;
    });
  };

  _syncTooltipState() {
    if (this.props.tooltipState) {
      this._mbMap.getCanvas().style.cursor = 'pointer';
      this._showTooltip();
    } else {
      this._mbMap.getCanvas().style.cursor = '';
      this._hideTooltip();
    }
  }

  _syncDrawControl() {
    if (this.props.isDrawingFilter) {
      this._updateDrawControl();
    } else {
      this._removeDrawControl();
    }
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

  _getLayerByMbLayerId(mbLayerId) {
    return this.props.layerList.find((layer) => {
      const mbLayerIds = layer.getMbLayerIds();
      return mbLayerIds.indexOf(mbLayerId) > -1;
    });
  }

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
    const drawTooltip = this._mbMap && this.props.isDrawingFilter
      ? <DrawTooltip mbMap={this._mbMap} drawState={this.props.drawState}/>
      : null;
    return (
      <div
        id="mapContainer"
        className="mapContainer"
        ref="mapContainer"
        data-test-subj="mapContainer"
      >
        {drawTooltip}
      </div>
    );
  }
}


function clamp(val, min, max) {
  if (val > max) val = max;
  else if (val < min) val = min;
  return val;
}
