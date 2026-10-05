/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import { supported as maplibreglSupported } from '@mapbox/mapbox-gl-supported';
import type { Adapters } from '@kbn/inspector-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { maplibregl } from '@kbn/mapbox-gl';
import type { Map as MapApi, MapOptions, MapMouseEvent } from '@kbn/mapbox-gl';
import { METRIC_TYPE } from '@kbn/analytics';
import { DrawFilterControl } from './draw_control/draw_filter_control';
import { ScaleControl } from './scale_control';
import { TooltipControl } from './tooltip_control';
import { getInitialView } from './get_initial_view';
import {
  getPreserveDrawingBuffer,
  getUsageCollection,
  isScreenshotMode,
} from '../../kibana_services';
import type { ILayer } from '../../classes/layers/layer';
import type {
  CustomIcon,
  MapCenter,
  MapCenterAndZoom,
  MapSettings,
  Timeslice,
} from '../../../common/descriptor_types';
import type { RawValue } from '../../../common/constants';
import {
  APP_ID,
  CUSTOM_ICON_SIZE,
  DECIMAL_DEGREES_PRECISION,
  MAKI_ICON_SIZE,
  ZOOM_PRECISION,
} from '../../../common/constants';
import { getCanAccessEmsFonts, getGlyphs, getKibanaFontsGlyphUrl } from './glyphs';
import { syncLayerOrder } from './sort_layers';

import { removeOrphanedSourcesAndLayers } from './remove_orphaned';
import type { RenderToolTipContent } from '../../classes/tooltips/tooltip_property';
import { TileStatusTracker } from './tile_status_tracker';
import { DrawFeatureControl } from './draw_control/draw_feature_control';
import type { MapExtentState } from '../../reducers/map/types';
import { CUSTOM_ICON_PIXEL_RATIO, createSdfIcon } from '../../classes/styles/vector/symbol_utils';
import { MAKI_ICONS } from '../../classes/styles/vector/maki_icons';
import { KeydownScrollZoom } from './keydown_scroll_zoom/keydown_scroll_zoom';
import { transformRequest } from './transform_request';
import { boundsToExtent } from '../../classes/util/maplibre_utils';

function getMapExtentState(mapApi: MapApi): MapExtentState {
  const zoom = mapApi.getZoom();
  const mbCenter = mapApi.getCenter();
  const mbBounds = mapApi.getBounds();
  return {
    zoom: _.round(zoom, ZOOM_PRECISION),
    center: {
      lon: _.round(mbCenter.lng, DECIMAL_DEGREES_PRECISION),
      lat: _.round(mbCenter.lat, DECIMAL_DEGREES_PRECISION),
    },
    extent: boundsToExtent(mbBounds),
  };
}

export interface Props {
  setMapApi: (mapApi?: MapApi) => void;
  initialMapCenter: MapCenter | null;
  initialMapZoom: number | null;
  settings: MapSettings;
  customIcons: CustomIcon[];
  layerList: ILayer[];
  spatialFiltersLayer: ILayer;
  inspectorAdapters: Adapters;
  isFullScreen: boolean;
  extentChanged: (mapExtentState: MapExtentState) => void;
  onMapReady: (mapExtentState: MapExtentState) => void;
  onMapDestroyed: () => void;
  setMouseCoordinates: ({ lat, lon }: { lat: number; lon: number }) => void;
  clearMouseCoordinates: () => void;
  setMapInitError: (errorMessage: string) => void;
  addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
  onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => Promise<void>;
  renderTooltipContent?: RenderToolTipContent;
  timeslice?: Timeslice;
  featureModeActive: boolean;
  filterModeActive: boolean;
  onMapMove?: (lat: number, lon: number, zoom: number) => void;
  isMapLoading: boolean;
}

export class MbMap extends Component<Props> {
  private _isMounted: boolean = false;
  private _mbMap: MapApi | undefined;
  private _containerRef: HTMLDivElement | null = null;
  private _prevCustomIcons?: CustomIcon[];
  private _prevDisableInteractive?: boolean;
  private _prevProjection?: MapSettings['projection'];
  private _prevLayerList?: ILayer[];
  private _prevTimeslice?: Timeslice;
  private _navigationControl = new maplibregl.NavigationControl({ showCompass: false });

  componentDidMount() {
    this._initializeMap();
    this._isMounted = true;
  }

  componentDidUpdate(prevProps: Props) {
    this._debouncedSync();
    if (this._containerRef && prevProps.isMapLoading !== this.props.isMapLoading) {
      this._containerRef.dataset.mapLoading = String(this.props.isMapLoading);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this._mbMap) {
      this._mbMap.remove();
      this._mbMap = undefined;
      this.props.setMapApi(undefined);
    }
    this.props.onMapDestroyed();
  }

  _debouncedSync = _.debounce(() => {
    if (this._isMounted && this._mbMap) {
      const hasLayerListChanged = this._prevLayerList !== this.props.layerList; // Comparing re-select memoized instance so no deep equals needed
      const hasTimesliceChanged = !_.isEqual(this._prevTimeslice, this.props.timeslice);
      if (hasLayerListChanged || hasTimesliceChanged) {
        this._prevLayerList = this.props.layerList;
        this._prevTimeslice = this.props.timeslice;
        this._syncMbMapWithLayerList();
        this._syncMbMapWithInspector();
      }
      this.props.spatialFiltersLayer.syncLayerWithMB(this._mbMap);
      this._syncSettings();
    }
  }, 256);

  _updateViewDataAttributes() {
    if (!this._containerRef || !this._mbMap) return;
    const { zoom, center } = getMapExtentState(this._mbMap);
    this._containerRef.dataset.mapLat = String(center.lat);
    this._containerRef.dataset.mapLon = String(center.lon);
    this._containerRef.dataset.mapZoom = String(zoom);
  }

  async _createMbMapInstance(initialView: MapCenterAndZoom | null): Promise<MapApi> {
    this._reportUsage();
    return new Promise((resolve) => {
      const glyphs = getGlyphs();
      const mbStyle = {
        version: 8 as 8,
        sources: {},
        layers: [],
        glyphs: glyphs.glyphUrlTemplate,
      };

      const options: MapOptions = {
        attributionControl: false,
        container: this._containerRef!,
        style: mbStyle,
        canvasContextAttributes: {
          preserveDrawingBuffer: getPreserveDrawingBuffer(),
        },
        maxZoom: this.props.settings.maxZoom,
        minZoom: this.props.settings.minZoom,
        transformRequest,
      };
      if (initialView) {
        options.zoom = initialView.zoom;
        options.center = {
          lng: initialView.lon,
          lat: initialView.lat,
        };
      } else if (this.props.initialMapCenter) {
        if (this.props.initialMapZoom !== null) {
          options.zoom = this.props.initialMapZoom;
        }
        options.center = {
          lng: this.props.initialMapCenter.lon,
          lat: this.props.initialMapCenter.lat,
        };
      } else {
        options.bounds = [-170, -60, 170, 75];
      }
      const mbMap = new maplibregl.Map(options);
      mbMap.dragRotate.disable();
      mbMap.touchZoomRotate.disableRotation();

      let emptyImage: HTMLImageElement;
      mbMap.on('styleimagemissing', (e: unknown) => {
        if (emptyImage) {
          // @ts-expect-error
          mbMap.addImage(e.id, emptyImage);
        }
      });
      mbMap.on('load', () => {
        // Map instance automatically resizes when container size changes.
        // However, issues may arise if container resizes before map finishes loading.
        // This is occuring when by-value maps are used in dashboard.
        // To prevent issues, resize container after load
        mbMap.resize();

        emptyImage = new Image();
        emptyImage.src =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQYV2NgAAIAAAUAAarVyFEAAAAASUVORK5CYII=';
        emptyImage.crossOrigin = 'anonymous';
        resolve(mbMap);
      });

      if (glyphs.isEmsFont) {
        getCanAccessEmsFonts().then((canAccessEmsFonts: boolean) => {
          if (!this._isMounted || canAccessEmsFonts) {
            return;
          }

          // fallback to kibana fonts when EMS fonts are not accessable to prevent layers from not displaying
          mbMap.setStyle({
            ...mbMap.getStyle(),
            glyphs: getKibanaFontsGlyphUrl(),
          });
        });
      }
    });
  }

  async _initializeMap() {
    const initialView = await getInitialView(this.props.settings);
    if (!this._isMounted) {
      return;
    }

    let mbMap: MapApi;
    try {
      mbMap = await this._createMbMapInstance(initialView);
    } catch (error) {
      this.props.setMapInitError(error.message);
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this._mbMap = mbMap;
    this.props.setMapApi(mbMap);
    this._updateViewDataAttributes();
    this.props.onMapReady(getMapExtentState(mbMap));
    this._loadMakiSprites(mbMap);
    this._registerMapEventListeners(mbMap);
  }

  _registerMapEventListeners(mbMap: MapApi) {
    // moveend callback is debounced to avoid updating map extent state while map extent is still changing
    // moveend is fired while the map extent is still changing in the following scenarios
    // * During opening/closing of layer details panel, the EUI animation results in 8 moveend events
    mbMap.on(
      'moveend',
      _.debounce(() => {
        if (this._isMounted && this._mbMap) {
          this._updateViewDataAttributes();
          this.props.extentChanged(getMapExtentState(this._mbMap));
        }
      }, 100)
    );

    // do not update redux state on 'move' event for performance reasons
    // instead, callback provided for cases where consumers need to react to "move" event
    mbMap.on('move', () => {
      if (this.props.onMapMove && this._mbMap) {
        const { zoom, center } = getMapExtentState(this._mbMap);
        this.props.onMapMove(center.lat, center.lon, zoom);
      }
    });

    // Attach event only if view control is visible, which shows lat/lon
    if (!this.props.settings.hideViewControl) {
      const throttledSetMouseCoordinates = _.throttle((e: MapMouseEvent) => {
        this.props.setMouseCoordinates({
          lat: e.lngLat.lat,
          lon: e.lngLat.lng,
        });
      }, 100);
      mbMap.on('mousemove', throttledSetMouseCoordinates);
      mbMap.on('mouseout', () => {
        throttledSetMouseCoordinates.cancel(); // cancel any delayed setMouseCoordinates invocations
        this.props.clearMouseCoordinates();
      });
    }
  }

  _reportUsage() {
    const usageCollector = getUsageCollection();
    if (!usageCollector) return;

    const webglSupport = maplibreglSupported();

    usageCollector.reportUiCounter(
      APP_ID,
      METRIC_TYPE.LOADED,
      webglSupport ? 'gl_webglSupported' : 'gl_webglNotSupported'
    );

    // Report low system performance or no hardware GPU
    if (webglSupport && !maplibreglSupported({ failIfMajorPerformanceCaveat: true })) {
      usageCollector.reportUiCounter(APP_ID, METRIC_TYPE.LOADED, 'gl_majorPerformanceCaveat');
    }
  }

  async _loadMakiSprites(mbMap: MapApi) {
    if (this._isMounted) {
      // Math.floor rounds values < 1 to 0. This occurs when browser is zoomed out
      // Math.max wrapper ensures value is always at least 1 in these cases
      const pixelRatio = Math.max(Math.floor(window.devicePixelRatio), 1);
      for (const [symbolId, { svg }] of Object.entries(MAKI_ICONS)) {
        if (!mbMap.hasImage(symbolId)) {
          const imageData = await createSdfIcon({ renderSize: MAKI_ICON_SIZE, svg });
          if (imageData) {
            mbMap.addImage(symbolId, imageData, {
              pixelRatio,
              sdf: true,
            });
          }
        }
      }
    }
  }

  _syncMbMapWithLayerList = () => {
    if (!this._mbMap) {
      return;
    }

    removeOrphanedSourcesAndLayers(
      this._mbMap,
      this.props.layerList,
      this.props.spatialFiltersLayer
    );
    this.props.layerList.forEach((layer) =>
      layer.syncLayerWithMB(this._mbMap!, this.props.timeslice)
    );
    syncLayerOrder(this._mbMap, this.props.spatialFiltersLayer, this.props.layerList);
  };

  _syncMbMapWithInspector = () => {
    if (!this.props.inspectorAdapters.map || !this._mbMap) {
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

  _syncSettings() {
    if (!this._mbMap) {
      return;
    }

    if (this._prevProjection !== this.props.settings.projection) {
      this._prevProjection = this.props.settings.projection;
      if (this.props.settings.projection === 'globeInterpolate') {
        this._mbMap.setProjection({
          type: ['interpolate', ['linear'], ['zoom'], 0, 'globe', 9, 'mercator'],
        });
      } else {
        this._mbMap.setProjection({ type: 'mercator' });
      }
    }

    if (
      !isScreenshotMode() &&
      (this._prevDisableInteractive === undefined ||
        this._prevDisableInteractive !== this.props.settings.disableInteractive)
    ) {
      this._prevDisableInteractive = this.props.settings.disableInteractive;
      if (this.props.settings.disableInteractive) {
        this._mbMap.boxZoom.disable();
        this._mbMap.doubleClickZoom.disable();
        this._mbMap.dragPan.disable();
        try {
          this._mbMap.removeControl(this._navigationControl);
        } catch (error) {
          // ignore removeControl errors
        }
      } else {
        this._mbMap.boxZoom.enable();
        this._mbMap.doubleClickZoom.enable();
        this._mbMap.dragPan.enable();
        this._mbMap.addControl(this._navigationControl, 'top-left');
      }
    }

    if (
      this._prevCustomIcons === undefined ||
      !_.isEqual(this._prevCustomIcons, this.props.customIcons)
    ) {
      this._prevCustomIcons = this.props.customIcons;
      const mbMap = this._mbMap;
      for (const { symbolId, svg, cutoff, radius } of this.props.customIcons) {
        createSdfIcon({ svg, renderSize: CUSTOM_ICON_SIZE, cutoff, radius }).then(
          (imageData: ImageData | null) => {
            if (!imageData) {
              return;
            }
            if (mbMap.hasImage(symbolId)) mbMap.updateImage(symbolId, imageData);
            else
              mbMap.addImage(symbolId, imageData, {
                sdf: true,
                pixelRatio: CUSTOM_ICON_PIXEL_RATIO,
              });
          }
        );
      }
    }

    let zoomRangeChanged = false;
    if (this.props.settings.minZoom !== this._mbMap.getMinZoom()) {
      this._mbMap.setMinZoom(this.props.settings.minZoom);
      zoomRangeChanged = true;
    }
    if (this.props.settings.maxZoom !== this._mbMap.getMaxZoom()) {
      this._mbMap.setMaxZoom(this.props.settings.maxZoom);
      zoomRangeChanged = true;
    }

    // 'moveend' event not fired when map moves from setMinZoom or setMaxZoom
    // https://github.com/mapbox/mapbox-gl-js/issues/9610
    // hack to update extent after zoom update finishes moving map.
    if (zoomRangeChanged) {
      setTimeout(() => {
        if (this._isMounted && this._mbMap) {
          this._updateViewDataAttributes();
          this.props.extentChanged(getMapExtentState(this._mbMap));
        }
      }, 300);
    }
  }

  _setContainerRef = (element: HTMLDivElement) => {
    this._containerRef = element;
    if (element) {
      element.dataset.mapLoading = String(this.props.isMapLoading);
    }
  };

  render() {
    let drawFilterControl;
    let drawFeatureControl;
    let tooltipControl;
    let scaleControl;
    let keydownScrollZoomControl;
    let tileStatusTrackerControl;
    if (this._mbMap) {
      drawFilterControl =
        this.props.addFilters && this.props.filterModeActive ? (
          <DrawFilterControl mbMap={this._mbMap} addFilters={this.props.addFilters} />
        ) : null;
      drawFeatureControl = this.props.featureModeActive ? (
        <DrawFeatureControl mbMap={this._mbMap} />
      ) : null;
      tooltipControl = !this.props.settings.disableTooltipControl ? (
        <TooltipControl
          mbMap={this._mbMap}
          addFilters={this.props.addFilters}
          getFilterActions={this.props.getFilterActions}
          getActionContext={this.props.getActionContext}
          onSingleValueTrigger={this.props.onSingleValueTrigger}
          renderTooltipContent={this.props.renderTooltipContent}
        />
      ) : null;
      scaleControl = this.props.settings.showScaleControl ? (
        <ScaleControl mbMap={this._mbMap} isFullScreen={this.props.isFullScreen} />
      ) : null;
      keydownScrollZoomControl = this.props.settings.keydownScrollZoom ? (
        <KeydownScrollZoom mbMap={this._mbMap} />
      ) : null;
      tileStatusTrackerControl = <TileStatusTracker mbMap={this._mbMap} />;
    }
    return (
      <div
        id="mapContainer"
        className="mapContainer"
        ref={this._setContainerRef}
        data-test-subj="mapContainer"
      >
        {drawFilterControl}
        {drawFeatureControl}
        {keydownScrollZoomControl}
        {scaleControl}
        {tooltipControl}
        {tileStatusTrackerControl}
      </div>
    );
  }
}
