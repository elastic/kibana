import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import VislibVisualizationsChartProvider from 'ui/vislib/visualizations/_chart';
import VislibVisualizationsMapProvider from 'ui/vislib/visualizations/_map';
export default function TileMapFactory(Private) {

  let Chart = Private(VislibVisualizationsChartProvider);
  let TileMapMap = Private(VislibVisualizationsMapProvider);

  /**
   * Tile Map Visualization: renders maps
   *
   * @class TileMap
   * @constructor
   * @extends Chart
   * @param handler {Object} Reference to the Handler Class Constructor
   * @param chartEl {HTMLElement} HTML element to which the map will be appended
   * @param chartData {Object} Elasticsearch query results for this map
   */
  _.class(TileMap).inherits(Chart);
  function TileMap(handler, chartEl, chartData) {
    if (!(this instanceof TileMap)) {
      return new TileMap(handler, chartEl, chartData);
    }

    TileMap.Super.apply(this, arguments);

    // track the map objects
    this.maps = [];
    this._chartData = chartData || {};
    _.assign(this, this._chartData);

    this._appendGeoExtents();
  }

  /**
   * Draws tile map, called on chart render
   *
   * @method draw
   * @return {Function} - function to add a map to a selection
   */
  TileMap.prototype.draw = function () {
    let self = this;

    // clean up old maps
    self.destroy();

    return function (selection) {
      selection.each(function () {
        self._appendMap(this);
      });
    };
  };

  /**
   * Invalidate the size of the map, so that leaflet will resize to fit.
   * then moves to center
   *
   * @method resizeArea
   * @return {undefined}
   */
  TileMap.prototype.resizeArea = function () {
    this.maps.forEach(function (map) {
      map.updateSize();
    });
  };

  /**
   * clean up the maps
   *
   * @method destroy
   * @return {undefined}
   */
  TileMap.prototype.destroy = function () {
    this.maps = this.maps.filter(function (map) {
      map.destroy();
    });
  };

  /**
   * Adds allmin and allmax properties to geoJson data
   *
   * @method _appendMap
   * @param selection {Object} d3 selection
   */
  TileMap.prototype._appendGeoExtents = function () {
    // add allmin and allmax to geoJson
    let geoMinMax = this.handler.data.getGeoExtents();
    this.geoJson.properties.allmin = geoMinMax.min;
    this.geoJson.properties.allmax = geoMinMax.max;
  };

  /**
   * Renders map
   *
   * @method _appendMap
   * @param selection {Object} d3 selection
   */
  TileMap.prototype._appendMap = function (selection) {
    const container = $(selection).addClass('tilemap');
    const uiStateParams = this.handler.vis ? {
      mapCenter: this.handler.vis.uiState.get('mapCenter'),
      mapZoom: this.handler.vis.uiState.get('mapZoom')
    } : {};

    const params = _.assign({}, _.get(this._chartData, 'geoAgg.vis.params'), uiStateParams);

    const map = new TileMapMap(container, this._chartData, {
      center: params.mapCenter,
      zoom: params.mapZoom,
      events: this.events,
      markerType: this._attr.mapType,
      tooltipFormatter: this.tooltipFormatter,
      valueFormatter: this.valueFormatter,
      attr: this._attr
    });

    // add title for splits
    if (this.title) {
      map.addTitle(this.title);
    }

    // add fit to bounds control
    if (_.get(this.geoJson, 'features.length') > 0) {
      map.addFitControl();
      map.addBoundingControl();
    }

    this.maps.push(map);
  };

  return TileMap;
};
