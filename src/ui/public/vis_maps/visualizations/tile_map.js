import _ from 'lodash';
import $ from 'jquery';
import VislibVisualizationsChartProvider from './_chart';
import VislibVisualizationsMapProvider from './_map';
export default function TileMapFactory(Private) {

  const Chart = Private(VislibVisualizationsChartProvider);
  const TileMapMap = Private(VislibVisualizationsMapProvider);

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
  class TileMap extends Chart {
    constructor(handler, chartEl, chartData) {
      super(handler, chartEl, chartData);

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
    draw() {
      const self = this;

      return function (selection) {
        selection.each(function () {
          self._appendMap(this);
        });
      };
    }

    /**
     * Invalidate the size of the map, so that leaflet will resize to fit.
     * then moves to center
     *
     * @method resizeArea
     * @return {undefined}
     */
    resizeArea() {
      this.maps.forEach(function (map) {
        map.updateSize();
      });
    }

    /**
     * clean up the maps
     *
     * @method destroy
     * @return {undefined}
     */
    destroy() {
      this.maps = this.maps.filter(function (map) {
        map.destroy();
      });
    }

    /**
     * Adds allmin and allmax properties to geoJson data
     *
     * @method _appendMap
     * @param selection {Object} d3 selection
     */
    _appendGeoExtents() {
      // add allmin and allmax to geoJson
      const geoMinMax = this.handler.data.getGeoExtents();
      this.geoJson.properties.allmin = geoMinMax.min;
      this.geoJson.properties.allmax = geoMinMax.max;
    }

    /**
     * Renders map
     *
     * @method _appendMap
     * @param selection {Object} d3 selection
     */
    _appendMap(selection) {
      const container = $(selection).addClass('tilemap');
      const uiStateParams = {
        mapCenter: this.handler.uiState.get('mapCenter'),
        mapZoom: this.handler.uiState.get('mapZoom')
      };

      const params = _.assign({}, _.get(this._chartData, 'geoAgg.vis.params'), uiStateParams);

      const tooltipFormatter = this.handler.visConfig.get('addTooltip') ? this.tooltipFormatter : null;
      const map = new TileMapMap(container, this._chartData, {
        center: params.mapCenter,
        zoom: params.mapZoom,
        events: this.events,
        markerType: this.handler.visConfig.get('mapType'),
        tooltipFormatter: tooltipFormatter,
        valueFormatter: this.valueFormatter,
        attr: this.handler.visConfig._values
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
    }
  }

  return TileMap;
}
