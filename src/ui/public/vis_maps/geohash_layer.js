import KibanaMapLayer from './kibana_map_layer';
import L from 'leaflet';
import _ from 'lodash';
import d3 from 'd3';
import $ from 'jquery';
import { EventEmitter } from 'events';

class ScaledCircles extends EventEmitter {

  constructor(featureCollection, options, targetZoom) {
    super();
    this._geohashGeoJson = featureCollection;
    this._zoom = targetZoom;
    this._valueFormatter = options.valueFormatter;
    this._tooltipFormatter = options.tooltipFormatter;
    this._legendColors = null;
    this._legendQuantizer = null;

    this._popups = [];
    this._leafletLayer = L.geoJson(null, {
      pointToLayer: this.getMarkerFunction(),
      style: this.getStyleFunction(),
      onEachFeature: (feature, layer) => {
        this._bindPopup(feature, layer);
      }
    });
    this._leafletLayer.addData(this._geohashGeoJson);
  }

  getLeafletLayer() {
    return this._leafletLayer;
  }


  getStyleFunction() {
    const min = _.get(this._geohashGeoJson, 'properties.min', 0);
    const max = _.get(this._geohashGeoJson, 'properties.max', 1);

    const quantizeDomain = (min !== max) ? [min, max] : d3.scale.quantize().domain();
    this._legendColors = makeCircleMarkerLegendColors(min, max);
    this._legendQuantizer = d3.scale.quantize().domain(quantizeDomain).range(this._legendColors);

    return makeStyleFunction(min, max, this._legendColors, quantizeDomain);
  }


  movePointer(event) {
  }

  getLabel() {
    if (this._popups.length) {
      return this._popups[0].feature.properties.aggConfigResult.aggConfig.makeLabel();
    }
    return '';
  }


  appendLegendContents(jqueryDiv) {

    if (!this._legendColors || !this._legendQuantizer) {
      return;
    }

    const titleText = this.getLabel();
    const $title = $('<div>').addClass('tilemap-legend-title').text(titleText);
    jqueryDiv.append($title);

    this._legendColors.forEach((color) => {
      const labelText = this._legendQuantizer
        .invertExtent(color)
        .map(this._valueFormatter)
        .join(' – ');

      const label = $('<div>');
      const icon = $('<i>').css({
        background: color,
        'border-color': makeColorDarker(color)
      });

      const text = $('<span>').text(labelText);
      label.append(icon);
      label.append(text);

      jqueryDiv.append(label);
    });

  }


  /**
   * Binds popup and events to each feature on map
   *
   * @method bindPopup
   * @param feature {Object}
   * @param layer {Object}
   * return {undefined}
   */
  _bindPopup(feature, layer) {
    const popup = layer.on({
      mouseover: (e) => {
        const layer = e.target;
        // bring layer to front if not older browser
        if (!L.Browser.ie && !L.Browser.opera) {
          layer.bringToFront();
        }
        this._showTooltip(feature);
      },
      mouseout: () => {
        this.emit('hideTooltip');
      }
    });

    this._popups.push(popup);
  }

  /**
   * Checks if event latlng is within bounds of mapData
   * features and shows tooltip for that feature
   *
   * @method _showTooltip
   * @param feature {LeafletFeature}
   * @param latLng? {Leaflet latLng}
   * @return undefined
   */
  _showTooltip(feature, latLng) {

    const lat = _.get(feature, 'geometry.coordinates.1');
    const lng = _.get(feature, 'geometry.coordinates.0');
    latLng = latLng || L.latLng(lat, lng);

    const content = this._tooltipFormatter(feature);
    if (!content) {
      return;
    }

    this.emit('showTooltip', {
      content: content,
      position: latLng
    });
  }

  getMarkerFunction() {
    const scaleFactor = 0.6;
    return (feature, latlng) => {
      const value = feature.properties.value;
      const scaledRadius = this._radiusScale(value) * scaleFactor;
      return L.circleMarker(latlng).setRadius(scaledRadius);
    };
  }

  /**
   * radiusScale returns a number for scaled circle markers
   * for relative sizing of markers
   *
   * @method _radiusScale
   * @param value {Number}
   * @return {Number}
   */
  _radiusScale(value) {

    //magic numbers
    const precisionBiasBase = 5;
    const precisionBiasNumerator = 200;

    const precision = _.max(this._geohashGeoJson.features.map((feature) => {
      return String(feature.properties.geohash).length;
    }));

    const pct = Math.abs(value) / Math.abs(this._geohashGeoJson.properties.max);
    const zoomRadius = 0.5 * Math.pow(2, this._zoom);
    const precisionScale = precisionBiasNumerator / Math.pow(precisionBiasBase, precision);

    // square root value percentage
    return Math.pow(pct, 0.5) * zoomRadius * precisionScale;
  }

  getBounds() {
    return this._leafletLayer.getBounds();
  }

}

class ShadedCircles extends ScaledCircles {
  getMarkerFunction() {
    // multiplier to reduce size of all circles
    const scaleFactor = 0.8;
    return (feature, latlng) => {
      const radius = this._geohashMinDistance(feature) * scaleFactor;
      return L.circle(latlng, radius);
    };
  }


  /**
   * _geohashMinDistance returns a min distance in meters for sizing
   * circle markers to fit within geohash grid rectangle
   *
   * @method _geohashMinDistance
   * @param feature {Object}
   * @return {Number}
   */
  _geohashMinDistance(feature) {
    const centerPoint = _.get(feature, 'properties.center');
    const geohashRect = _.get(feature, 'properties.rectangle');

    // centerPoint is an array of [lat, lng]
    // geohashRect is the 4 corners of the geoHash rectangle
    //   an array that starts at the southwest corner and proceeds
    //   clockwise, each value being an array of [lat, lng]

    // center lat and southeast lng
    const east = L.latLng([centerPoint[0], geohashRect[2][1]]);
    // southwest lat and center lng
    const north = L.latLng([geohashRect[3][0], centerPoint[1]]);

    // get latLng of geohash center point
    const center = L.latLng([centerPoint[0], centerPoint[1]]);

    // get smallest radius at center of geohash grid rectangle
    const eastRadius = Math.floor(center.distanceTo(east));
    const northRadius = Math.floor(center.distanceTo(north));
    return _.min([eastRadius, northRadius]);
  }
}

class GeohashGrid extends ScaledCircles {
  getMarkerFunction() {
    return function (feature, latlng) {
      const geohashRect = feature.properties.rectangle;
      // get bounds from northEast[3] and southWest[1]
      // corners in geohash rectangle
      const corners = [
        [geohashRect[3][0], geohashRect[3][1]],
        [geohashRect[1][0], geohashRect[1][1]]
      ];
      return L.rectangle(corners);
    };
  }
}


/**
 * Map overlay: canvas layer with leaflet.heat plugin
 *
 * @param map {Leaflet Object}
 * @param geoJson {geoJson Object}
 * @param params {Object}
 */
class Heatmap extends EventEmitter {

  constructor(featureCollection, options, zoom) {

    super();
    this._geojsonFeatureCollection = featureCollection;
    const max = _.get(featureCollection, 'properties.max');
    const points = dataToHeatArray(max, options.heatNormalizeData, featureCollection);
    this._leafletLayer = L.heatLayer(points, options);
    this._tooltipFormatter = options.tooltipFormatter;


    this._zoom = zoom;
    this._disableTooltips = false;
    this._getLatLng = _.memoize(function (feature) {
      return L.latLng(
        feature.geometry.coordinates[1],
        feature.geometry.coordinates[0]
      );
    }, function (feature) {
      // turn coords into a string for the memoize cache
      return [feature.geometry.coordinates[1], feature.geometry.coordinates[0]].join(',');
    });

    this._addTooltips();
  }

  getBounds() {
    return this._leafletLayer.getBounds();
  }

  getLeafletLayer() {
    return this._leafletLayer;
  }

  appendLegendContents(jqueryDiv) {
  }


  movePointer(type, event) {
    if (type === 'mousemove') {
      this._deboundsMoveMoveLocation(event);
    } else if (type === 'mouseout') {
      this.emit('hideTooltip');
    } else if (type === 'mousedown') {
      this._disableTooltips = true;
      this.emit('hideTooltip');
    } else if (type === 'mouseup') {
      this._disableTooltips = false;
    }
  }


  _addTooltips() {

    const mouseMoveLocation = (e) => {

      const latlng = e.latlng;
      this.emit('hideTooltip');

      // unhighlight all svgs
      // d3.selectAll('path.geohash', this.chartEl).classed('geohash-hover', false);

      if (!this._geojsonFeatureCollection.features.length || this._disableTooltips) {
        return;
      }

      const feature = this._nearestFeature(latlng);
      if (this._tooltipProximity(latlng, feature)) {
        const content = this._tooltipFormatter(feature);
        if (!content) {
          return;
        }
        this.emit('showTooltip', {
          content: content,
          position: latlng
        });
      }
    };


    const debouncedMouseMoveLocation = _.debounce(mouseMoveLocation.bind(this), 15, {
      'leading': true,
      'trailing': false
    });
    this._deboundsMoveMoveLocation = debouncedMouseMoveLocation;
  }

  /**
   * Finds nearest feature in mapData to event latlng
   *
   * @method _nearestFeature
   * @param latLng {Leaflet latLng}
   * @return nearestPoint {Leaflet latLng}
   */
  _nearestFeature(latLng) {
    const self = this;
    let nearest;

    if (latLng.lng < -180 || latLng.lng > 180) {
      return;
    }

    _.reduce(this._geojsonFeatureCollection.features, function (distance, feature) {
      const featureLatLng = self._getLatLng(feature);
      const dist = latLng.distanceTo(featureLatLng);

      if (dist < distance) {
        nearest = feature;
        return dist;
      }

      return distance;
    }, Infinity);

    return nearest;
  }

  /**
   * display tooltip if feature is close enough to event latlng
   *
   * @method _tooltipProximity
   * @param latlng {Leaflet latLng  Object}
   * @param feature {geoJson Object}
   * @return {Boolean}
   */
  _tooltipProximity(latlng, feature) {
    if (!feature) return;

    let showTip = false;
    const featureLatLng = this._getLatLng(feature);

    // zoomScale takes map zoom and returns proximity value for tooltip display
    // domain (input values) is map zoom (min 1 and max 18)
    // range (output values) is distance in meters
    // used to compare proximity of event latlng to feature latlng
    const zoomScale = d3.scale.linear()
      .domain([1, 4, 7, 10, 13, 16, 18])
      .range([1000000, 300000, 100000, 15000, 2000, 150, 50]);

    const proximity = zoomScale(this._zoom);
    const distance = latlng.distanceTo(featureLatLng);

    // maxLngDif is max difference in longitudes
    // to prevent feature tooltip from appearing 360°
    // away from event latlng
    const maxLngDif = 40;
    const lngDif = Math.abs(latlng.lng - featureLatLng.lng);

    if (distance < proximity && lngDif < maxLngDif) {
      showTip = true;
    }

    d3.scale.pow().exponent(0.2)
      .domain([1, 18])
      .range([1500000, 50]);
    return showTip;
  }

}

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

/**
 * d3 quantize scale returns a hex color, used for marker fill color
 *
 * @method quantizeLegendColors
 * return {undefined}
 */
function makeCircleMarkerLegendColors(min, max) {
  const reds1 = ['#ff6128'];
  const reds3 = ['#fecc5c', '#fd8d3c', '#e31a1c'];
  const reds5 = ['#fed976', '#feb24c', '#fd8d3c', '#f03b20', '#bd0026'];
  const bottomCutoff = 2;
  const middleCutoff = 24;
  let legendColors;
  if (max - min <= bottomCutoff) {
    legendColors = reds1;
  } else if (max - min <= middleCutoff) {
    legendColors = reds3;
  } else {
    legendColors = reds5;
  }
  return legendColors;
}

function makeColorDarker(color) {
  const amount = 1.3;//magic number, carry over from earlier
  return d3.hcl(color).darker(amount).toString();
}

function makeStyleFunction(min, max, legendColors, quantizeDomain) {
  const legendQuantizer = d3.scale.quantize().domain(quantizeDomain).range(legendColors);
  return (feature) => {
    const value = _.get(feature, 'properties.value');
    const color = legendQuantizer(value);
    return {
      fillColor: color,
      color: makeColorDarker(color),
      weight: 1.5,
      opacity: 1,
      fillOpacity: 0.75
    };
  };
}

/**
 * returns data for data for heat map intensity
 * if heatNormalizeData attribute is checked/true
 • normalizes data for heat map intensity
 *
 * @method _dataToHeatArray
 * @param max {Number}
 * @return {Array}
 */
function dataToHeatArray(max, heatNormalizeData, featureCollection) {

  return featureCollection.features.map((feature) => {
    // const lat = feature.properties.center[0];
    // const lng = feature.properties.center[1];
    const lat = feature.geometry.coordinates[1];
    const lng = feature.geometry.coordinates[0];
    let heatIntensity;
    if (!heatNormalizeData) {
      // show bucket value on heatmap
      heatIntensity = feature.properties.value;
    } else {
      // show bucket value normalized to max value
      heatIntensity = feature.properties.value / max;
    }

    return [lat, lng, heatIntensity];
  });
}
