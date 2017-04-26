import L from 'leaflet';
import _ from 'lodash';
import d3 from 'd3';
import $ from 'jquery';
import { EventEmitter } from 'events';

export class ScaledCirclesMarkers extends EventEmitter {

  constructor(featureCollection, options, targetZoom, kibanaMap) {
    super();
    this._geohashGeoJson = featureCollection;
    this._zoom = targetZoom;

    this._valueFormatter = options.valueFormatter;
    this._tooltipFormatter = options.tooltipFormatter;
    this._map = options.map;

    this._legendColors = null;
    this._legendQuantizer = null;

    this._popups = [];
    this._leafletLayer = L.geoJson(null, {
      pointToLayer: this.getMarkerFunction(),
      style: this.getStyleFunction(),
      onEachFeature: (feature, layer) => {
        this._bindPopup(feature, layer);
      },
      filter: (feature) => {
        const bucketRectBounds = _.get(feature, 'properties.rectangle');
        return kibanaMap.isInside(bucketRectBounds);
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


  movePointer() {
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
