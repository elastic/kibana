import _ from 'lodash';
import $ from 'jquery';
import L from 'leaflet';
import marked from 'marked';
marked.setOptions({
  gfm: true, // Github-flavored markdown
  sanitize: true // Sanitize HTML tags
});

import VislibVisualizationsMarkerTypesScaledCirclesProvider from 'ui/vislib/visualizations/marker_types/scaled_circles';
import VislibVisualizationsMarkerTypesShadedCirclesProvider from 'ui/vislib/visualizations/marker_types/shaded_circles';
import VislibVisualizationsMarkerTypesGeohashGridProvider from 'ui/vislib/visualizations/marker_types/geohash_grid';
import VislibVisualizationsMarkerTypesHeatmapProvider from 'ui/vislib/visualizations/marker_types/heatmap';
export default function MapFactory(Private, tilemap, $sanitize) {

  const defaultMapZoom = 2;
  const defaultMapCenter = [15, 5];
  const defaultMarkerType = 'Scaled Circle Markers';

  const tilemapOptions = tilemap.options;
  const attribution = $sanitize(marked(tilemapOptions.attribution));

  const mapTiles = {
    url: tilemap.url,
    options: _.assign({}, tilemapOptions, { attribution })
  };

  const markerTypes = {
    'Scaled Circle Markers': Private(VislibVisualizationsMarkerTypesScaledCirclesProvider),
    'Shaded Circle Markers': Private(VislibVisualizationsMarkerTypesShadedCirclesProvider),
    'Shaded Geohash Grid': Private(VislibVisualizationsMarkerTypesGeohashGridProvider),
    'Heatmap': Private(VislibVisualizationsMarkerTypesHeatmapProvider),
  };

  /**
   * Tile Map Maps
   *
   * @class Map
   * @constructor
   * @param container {HTML Element} Element to render map into
   * @param chartData {Object} Elasticsearch query results for this map
   * @param params {Object} Parameters used to build a map
   */
  class TileMapMap {
    constructor(container, chartData, params) {
      this._container = $(container).get(0);
      this._chartData = chartData;

      // keep a reference to all of the optional params
      this._events = _.get(params, 'events');
      this._markerType = markerTypes[params.markerType] ? params.markerType : defaultMarkerType;
      this._valueFormatter = params.valueFormatter || _.identity;
      this._tooltipFormatter = params.tooltipFormatter || _.identity;
      this._geoJson = _.get(this._chartData, 'geoJson');
      this._mapZoom = Math.max(Math.min(params.zoom || defaultMapZoom, tilemapOptions.maxZoom), tilemapOptions.minZoom);
      this._mapCenter = params.center || defaultMapCenter;
      this._attr = params.attr || {};

      const mapOptions = {
        minZoom: tilemapOptions.minZoom,
        maxZoom: tilemapOptions.maxZoom,
        noWrap: true,
        maxBounds: L.latLngBounds([-90, -220], [90, 220]),
        scrollWheelZoom: false,
        fadeAnimation: false,
      };

      this._createMap(mapOptions);
    }

    addBoundingControl() {
      if (this._boundingControl) return;

      const self = this;
      const drawOptions = {draw: {}};

      _.each(['polyline', 'polygon', 'circle', 'marker', 'rectangle'], function (drawShape) {
        if (self._events && !self._events.listenerCount(drawShape)) {
          drawOptions.draw[drawShape] = false;
        } else {
          drawOptions.draw[drawShape] = {
            shapeOptions: {
              stroke: false,
              color: '#000'
            }
          };
        }
      });

      this._boundingControl = new L.Control.Draw(drawOptions);
      this.map.addControl(this._boundingControl);
    };

    addFitControl() {
      if (this._fitControl) return;

      const self = this;
      const fitContainer = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-control-fit');

      // Add button to fit container to points
      const FitControl = L.Control.extend({
        options: {
          position: 'topleft'
        },
        onAdd: function () {
          $(fitContainer).html('<a class="fa fa-crop" href="#" title="Fit Data Bounds"></a>')
            .on('click', function (e) {
              e.preventDefault();
              self._fitBounds();
            });

          return fitContainer;
        },
        onRemove: function () {
          $(fitContainer).off('click');
        }
      });

      this._fitControl = new FitControl();
      this.map.addControl(this._fitControl);
    };

    /**
     * Adds label div to each map when data is split
     *
     * @method addTitle
     * @param mapLabel {String}
     * @return {undefined}
     */
    addTitle(mapLabel) {
      if (this._label) return;

      const label = this._label = L.control();

      label.onAdd = function () {
        this._div = L.DomUtil.create('div', 'tilemap-info tilemap-label');
        this.update();
        return this._div;
      };
      label.update = function () {
        this._div.innerHTML = '<h2>' + _.escape(mapLabel) + '</h2>';
      };

      // label.addTo(this.map);
      this.map.addControl(label);
    };

    /**
     * remove css class for desat filters on map tiles
     *
     * @method saturateTiles
     * @return undefined
     */
    saturateTiles() {
      if (!this._attr.isDesaturated) {
        $('img.leaflet-tile-loaded').addClass('filters-off');
      }
    };

    updateSize() {
      this.map.invalidateSize({
        debounceMoveend: true
      });
    };

    destroy() {
      if (this._label) this._label.removeFrom(this.map);
      if (this._fitControl) this._fitControl.removeFrom(this.map);
      if (this._boundingControl) this._boundingControl.removeFrom(this.map);
      if (this._markers) this._markers.destroy();
      this.map.remove();
      this.map = undefined;
    };

    /**
     * Switch type of data overlay for map:
     * creates featurelayer from mapData (geoJson)
     *
     * @method _addMarkers
     */
    _addMarkers() {
      if (!this._geoJson) return;
      if (this._markers) this._markers.destroy();

      this._markers = this._createMarkers({
        tooltipFormatter: this._tooltipFormatter,
        valueFormatter: this._valueFormatter,
        attr: this._attr
      });

      if (this._geoJson.features.length > 1) {
        this._markers.addLegend();
      }
    };

    /**
     * Create the marker instance using the given options
     *
     * @method _createMarkers
     * @param options {Object} options to give to marker class
     * @return {Object} marker layer
     */
    _createMarkers(options) {
      const MarkerType = markerTypes[this._markerType];
      return new MarkerType(this.map, this._geoJson, options);
    };

    _attachEvents() {
      const self = this;
      const saturateTiles = self.saturateTiles.bind(self);

      this._tileLayer.on('tileload', saturateTiles);

      this._tileLayer.on('load', () => {
        if (!self._events) return;

        self._events.emit('rendered', {
          chart: self._chartData,
          map: self.map,
          center: self._mapCenter,
          zoom: self._mapZoom,
        });
      });

      this.map.on('unload', function () {
        self._tileLayer.off('tileload', saturateTiles);
      });

      this.map.on('moveend', function setZoomCenter() {
        if (!self.map) return;
        // update internal center and zoom references
        const uglyCenter = self.map.getCenter();
        self._mapCenter = [uglyCenter.lat, uglyCenter.lng];
        self._mapZoom = self.map.getZoom();
        self._addMarkers();

        if (!self._events) return;

        self._events.emit('mapMoveEnd', {
          chart: self._chartData,
          map: self.map,
          center: self._mapCenter,
          zoom: self._mapZoom,
        });
      });

      this.map.on('draw:created', function (e) {
        const drawType = e.layerType;
        if (!self._events || !self._events.listenerCount(drawType)) return;

        // TODO: Different drawTypes need differ info. Need a switch on the object creation
        const bounds = e.layer.getBounds();

        let SElng = bounds.getSouthEast().lng;
        if (SElng > 180) {
          SElng -= 360;
        }
        let NWlng = bounds.getNorthWest().lng;
        if (NWlng < -180) {
          NWlng += 360;
        }
        self._events.emit(drawType, {
          e: e,
          chart: self._chartData,
          bounds: {
            top_left: {
              lat: bounds.getNorthWest().lat,
              lon: NWlng
            },
            bottom_right: {
              lat: bounds.getSouthEast().lat,
              lon: SElng
            }
          }
        });
      });

      this.map.on('zoomend', function () {
        if (!self.map) return;
        self._mapZoom = self.map.getZoom();
        if (!self._events) return;

        self._events.emit('mapZoomEnd', {
          chart: self._chartData,
          map: self.map,
          zoom: self._mapZoom,
        });
      });
    };

    _createMap(mapOptions) {
      if (this.map) this.destroy();

      // add map tiles layer, using the mapTiles object settings
      if (this._attr.wms && this._attr.wms.enabled) {
        _.assign(mapOptions, {
          minZoom: 1,
          maxZoom: 18
        });
        this._tileLayer = L.tileLayer.wms(this._attr.wms.url, this._attr.wms.options);
      } else {
        this._tileLayer = L.tileLayer(mapTiles.url, mapTiles.options);
      }

      // append tile layers, center and zoom to the map options
      mapOptions.layers = this._tileLayer;
      mapOptions.center = this._mapCenter;
      mapOptions.zoom = this._mapZoom;

      this.map = L.map(this._container, mapOptions);
      this._attachEvents();
      this._addMarkers();
    };

    /**
     * zoom map to fit all features in featureLayer
     *
     * @method _fitBounds
     * @param map {Leaflet Object}
     * @return {boolean}
     */
    _fitBounds() {
      this.map.fitBounds(this._getDataRectangles());
    };

    /**
     * Get the Rectangles representing the geohash grid
     *
     * @return {LatLngRectangles[]}
     */
    _getDataRectangles() {
      if (!this._geoJson) return [];
      return _.pluck(this._geoJson.features, 'properties.rectangle');
    };
  }

  return TileMapMap;
};
