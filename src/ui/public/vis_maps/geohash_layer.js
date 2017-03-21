import KibanaMapLayer from './kibana_map_layer';
import _ from 'lodash';
import d3 from 'd3';
import { EventEmitter } from 'events';
import Heatmap from './heatmap';
import ScaledCircles from './scaled_circles';
import ShadedCircles from './shaded_circles';
import GeohashGrid from './geohash_grid';

export default class GeohashLayer extends KibanaMapLayer {

  constructor(featureCollection, options, zoom) {

    super();

    this._geohashGeoJson = featureCollection;
    this._geohashOptions = options;
    this._zoom = zoom;

    this._geohashMarkers = null;

    const markerOptions = {
      valueFormatter: this._geohashOptions.valueFormatter,
      tooltipFormatter: this._geohashOptions.tooltipFormatter
    };

    switch (this._geohashOptions.mapType) {
      case 'Scaled Circle Markers':
        this._geohashMarkers = new ScaledCircles(this._geohashGeoJson, markerOptions, zoom);
        break;
      case 'Shaded Circle Markers':
        this._geohashMarkers = new ShadedCircles(this._geohashGeoJson, markerOptions, zoom);
        break;
      case 'Shaded Geohash Grid':
        this._geohashMarkers = new GeohashGrid(this._geohashGeoJson, markerOptions, zoom);
        break;
      case 'Heatmap':
        this._geohashMarkers = new Heatmap(this._geohashGeoJson, {
          radius: +this._geohashOptions.heatmap.heatRadius,
          blur: +this._geohashOptions.heatmap.heatBlur,
          maxZoom: +this._geohashOptions.heatmap.heatMaxZoom,
          minOpaxity: +this._geohashOptions.heatmap.heatMinOpacity,
          heatNormalizeData: this._geohashOptions.heatmap.heatNormalizeData,
          tooltipFormatter: this._geohashOptions.tooltipFormatter
        }, zoom);
        break;
      default:
        throw new Error(`${this._geohashOptions.mapType} mapType not recognized`);

    }

    this._geohashMarkers.on('showTooltip', (event) => this.emit('showTooltip', event));
    this._geohashMarkers.on('hideTooltip', (event) => this.emit('hideTooltip', event));


    this._leafletLayer = this._geohashMarkers.getLeafletLayer();
    this._legend = null;
  }

  appendLegendContents(jqueryDiv) {
    return this._geohashMarkers.appendLegendContents(jqueryDiv);
  }

  movePointer(...args) {
    this._geohashMarkers.movePointer(...args);
  }


  isReusable(options) {

    if (_.isEqual(this._geohashOptions, options)) {
      return true;
    }

    if (this._geohashOptions.mapType !== options.mapType) {
      return false;
    } else if (this._geohashOptions.mapType === 'Heatmap' && !_.isEqual(this._geohashOptions.heatmap, options)) {
      return false;
    }

    return true;
  }
}



