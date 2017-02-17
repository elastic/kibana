import { EventEmitter } from 'events';
import L from 'leaflet';
import _ from 'lodash';
import d3 from 'd3';
import $ from 'jquery';
import colorramps from 'ui/vislib/components/color/colormaps';
import zoomToPrecision from 'ui/utils/zoom_to_precision';
// import Notifier from 'ui/notify/notifier';


class GeohashGridOverlay {

  constructor(featureCollection, layerOptions, targetZoom) {
    this._featureCollection = featureCollection;
    this._zoom = targetZoom;
    this.createLeafletLayer(layerOptions);
  }

  createLeafletLayer(ignoreLayerOptions) {
    this._leafletLayer = L.geoJson(null, {
      pointToLayer: this.getMarkerFunction(),
      style: this.getStyleFunction()
    });
    this._leafletLayer.addData(this._featureCollection);
  }

  getFeatureCollection() {
    return this._featureCollection;
  }

  addToLeafletMap(leafletMap) {
    leafletMap.invalidateSize();
    this._leafletLayer.addTo(leafletMap);
  }

  removeFromMap(leafletMap) {
    leafletMap.removeLayer(this._leafletLayer);
  }

  getMarkerFunction() {
    throw new Error('should implement getMarkerFunction');
  }

  getStyleFunction() {
    const min = _.get(this._featureCollection, 'properties.min', 0);
    const max = _.get(this._featureCollection, 'properties.max', 1);
    this._legendColors = makeCircleMarkerLegendColors(min, max);
    const styleFunction = makeStyleFunction(min, max, this._legendColors);
    return styleFunction;
  }

  _setStyle() {
    const style = this.getStyleFunction();
    this._leafletLayer.setStyle(style);
  }


}


class ScaledCircleOverlay extends GeohashGridOverlay {
  constructor() {
    super(...arguments);
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
    const precisionBiasBase = 5;
    const precisionBiasNumerator = 200;
    // const zoom = this._featureCollection.properties.zoom;

    const zoom = this._zoom;
    const maxValue = this._featureCollection.properties.max;
    const precision = _.max(this._featureCollection.features.map((feature) => {
      return String(feature.properties.geohash).length;
    }));

    const pct = Math.abs(value) / Math.abs(maxValue);
    const zoomRadius = 0.5 * Math.pow(2, zoom);
    const precisionScale = precisionBiasNumerator / Math.pow(precisionBiasBase, precision);

    // square root value percentage
    return Math.pow(pct, 0.5) * zoomRadius * precisionScale;
  }

  getBounds() {
    return this._leafletLayer.getBounds();
  }


}


/**
 * Map overlay: canvas layer with leaflet.heat plugin
 *
 * @param map {Leaflet Object}
 * @param geoJson {geoJson Object}
 * @param params {Object}
 */
class HeatmapOverlay extends GeohashGridOverlay {

  constructor(featureCollection, layerOptions) {
    super(...arguments);
    // super(map, geoJson, params);
    // this._disableTooltips = false;
    //
    // this._createMarkerGroup({
    //   radius: +this._attr.heatRadius,
    //   blur: +this._attr.heatBlur,
    //   maxZoom: +this._attr.heatMaxZoom,
    //   minOpacity: +this._attr.heatMinOpacity
    // });
    //
    // this.addLegend = _.noop;
    //
    // this._getLatLng = _.memoize(function (feature) {
    //   return L.latLng(
    //     feature.geometry.coordinates[1],
    //     feature.geometry.coordinates[0]
    //   );
    // }, function (feature) {
    //   // turn coords into a string for the memoize cache
    //   return [feature.geometry.coordinates[1], feature.geometry.coordinates[0]].join(',');
    // });
  }


  createLeafletLayer(heatmapOptions) {
    const max = _.get(this._featureCollection, 'properties.max');
    const points = dataToHeatArray(max, heatmapOptions.heatNormalizeData, this._featureCollection);
    this._leafletLayer = L.heatLayer(points, heatmapOptions);
    // this._fixTooltips();
    // this._addToMap();
  }

  // _createMarkerGroup(options) {
  //   const max = _.get(this.geoJson, 'properties.allmax');
  //   const points = this._dataToHeatArray(max);
  //
  //   this._markerGroup = L.heatLayer(points, options);
  //   this._fixTooltips();
  //   this._addToMap();
  // }
  //
  // _fixTooltips() {
  //   const self = this;
  //   const debouncedMouseMoveLocation = _.debounce(mouseMoveLocation.bind(this), 15, {
  //     'leading': true,
  //     'trailing': false
  //   });
  //
  //   if (!this._disableTooltips && this._attr.addTooltip) {
  //     this.map.on('mousemove', debouncedMouseMoveLocation);
  //     this.map.on('mouseout', function () {
  //       self.map.closePopup();
  //     });
  //     this.map.on('mousedown', function () {
  //       self._disableTooltips = true;
  //       self.map.closePopup();
  //     });
  //     this.map.on('mouseup', function () {
  //       self._disableTooltips = false;
  //     });
  //   }
  //
  //   function mouseMoveLocation(e) {
  //     const latlng = e.latlng;
  //
  //     this.map.closePopup();
  //
  //     // unhighlight all svgs
  //     d3.selectAll('path.geohash', this.chartEl).classed('geohash-hover', false);
  //
  //     if (!this.geoJson.features.length || this._disableTooltips) {
  //       return;
  //     }
  //
  //     // find nearest feature to event latlng
  //     const feature = this._nearestFeature(latlng);
  //
  //     // show tooltip if close enough to event latlng
  //     if (this._tooltipProximity(latlng, feature)) {
  //       this._showTooltip(feature, latlng);
  //     }
  //   }
  // }
  //
  // /**
  //  * Finds nearest feature in mapData to event latlng
  //  *
  //  * @method _nearestFeature
  //  * @param latLng {Leaflet latLng}
  //  * @return nearestPoint {Leaflet latLng}
  //  */
  // _nearestFeature(latLng) {
  //   const self = this;
  //   let nearest;
  //
  //   if (latLng.lng < -180 || latLng.lng > 180) {
  //     return;
  //   }
  //
  //   _.reduce(this.geoJson.features, function (distance, feature) {
  //     const featureLatLng = self._getLatLng(feature);
  //     const dist = latLng.distanceTo(featureLatLng);
  //
  //     if (dist < distance) {
  //       nearest = feature;
  //       return dist;
  //     }
  //
  //     return distance;
  //   }, Infinity);
  //
  //   return nearest;
  // }
  //
  // /**
  //  * display tooltip if feature is close enough to event latlng
  //  *
  //  * @method _tooltipProximity
  //  * @param latlng {Leaflet latLng  Object}
  //  * @param feature {geoJson Object}
  //  * @return {Boolean}
  //  */
  // _tooltipProximity(latlng, feature) {
  //   if (!feature) return;
  //
  //   let showTip = false;
  //   const featureLatLng = this._getLatLng(feature);
  //
  //   // zoomScale takes map zoom and returns proximity value for tooltip display
  //   // domain (input values) is map zoom (min 1 and max 18)
  //   // range (output values) is distance in meters
  //   // used to compare proximity of event latlng to feature latlng
  //   const zoomScale = d3.scale.linear()
  //     .domain([1, 4, 7, 10, 13, 16, 18])
  //     .range([1000000, 300000, 100000, 15000, 2000, 150, 50]);
  //
  //   const proximity = zoomScale(this.map.getZoom());
  //   const distance = latlng.distanceTo(featureLatLng);
  //
  //   // maxLngDif is max difference in longitudes
  //   // to prevent feature tooltip from appearing 360°
  //   // away from event latlng
  //   const maxLngDif = 40;
  //   const lngDif = Math.abs(latlng.lng - featureLatLng.lng);
  //
  //   if (distance < proximity && lngDif < maxLngDif) {
  //     showTip = true;
  //   }
  //
  //   d3.scale.pow().exponent(0.2)
  //     .domain([1, 18])
  //     .range([1500000, 50]);
  //   return showTip;
  // }

}


/**
 * Collects map functionality required for Kibana.
 * Serves as simple abstraction for leaflet as well.
 */
class KibanaMap extends EventEmitter {

  constructor(domNode) {

    super();

    this._leafletMap = L.map(domNode, {//todo: read this from meta
      minZoom: 2,
      maxZoom: 10
    });
    // this._leafletMap.setView([0, 0], 0);//todo: pass in from UI-state (if any)
    this._leafletMap.fitWorld();//todo: pass in from UI-state (if any)

    let previousZoom = this._leafletMap.getZoom();
    this._leafletMap.on('zoomend', e=> {
      if (previousZoom !== this._leafletMap.getZoom()) {
        previousZoom = this._leafletMap.getZoom();
        this.emit('zoomchange');
      }
    });

    this._leafletMap.on('zoomend', e => {this.emit('zoomend');});
    this._leafletMap.on('moveend', e => this.emit('moveend'));

    this._leafletMap.on('draw:created', event => {
      const drawType = event.layerType;
      if (drawType === 'rectangle') {
        const bounds = event.layer.getBounds();

        const southEast = bounds.getSouthEast();
        const northWest = bounds.getNorthWest();
        let southEastLng = southEast.lng;
        if (southEastLng > 180) {
          southEastLng -= 360;
        }
        let northWestLng = northWest.lng;
        if (northWestLng < -180) {
          northWestLng += 360;
        }

        const southEastLat = southEast.lat;
        const northWestLat = northWest.lat;

        //Bounds cannot be created unless they form a box with larger than 0 dimensions
        //Invalid areas are rejected by ES.
        if (southEastLat === northWestLat || southEastLng === northWestLng) {
          return;
        }

        this.emit('drawCreated:rectangle', {
          bounds: {
            bottom_right: {
              lat: southEastLat,
              lon: southEastLng
            },
            top_left: {
              lat: northWestLat,
              lon: northWestLng
            }
          }
        });
      } else if (drawType === 'polygon') {
        const latLongs = event.layer.getLatLngs();
        this.emit('drawCreated:polygon', {
          points: latLongs.map(leafletLatLng => {
            return {
              lat: leafletLatLng.lat,
              lon: leafletLatLng.lng
            };
          })
        });
      }


    });

    this.resize();

    this._leafletBaseLayer = null;
    this._geohashGridOverlay = null;
    this._leafletDrawControl = null;
    this._geohashOptions = {};

    this._choroplethLeafletLayer = null;
    this._choroplethMetrics = null;
    this._choroplethColorRamp = colorramps['Yellow to Red'];

  }


  destroy() {
    //todo
    this._leafletMap.remove();
  }

  getCenter() {
    const center = this._leafletMap.getCenter();
    return { lon: center.lng, lat: center.lat };
  }


  setChoroplethLayer(url, joinfield) {

    if (this._choroplethUrl === url) {
      if (this._joinField !== joinfield) {
        this._joinField = joinfield;
        this._setChoroplethStyle();
      }
      // console.log('skip requesting data, is the same');
      return;
    }

    this._joinField = joinfield;
    this._choroplethUrl = url;

    if (this._choroplethLeafletLayer) {
      this._leafletMap.removeLayer(this._choroplethLeafletLayer);
    }

    this._choroplethLeafletLayer = L.geoJson(null, {
      onEachFeature: (feature, layer) => {
        layer.on('click', () => {
          this.emit('choropleth:select', feature.properties[this._joinField]);
        });
      },
      style: emptyStyle
    });
    this._choroplethLeafletLayer.addTo(this._leafletMap);

    this._loaded = false;
    $.ajax({
      dataType: 'json',
      url: url,
      success: (data) => {
        this._choroplethLeafletLayer.addData(data);
        this._loaded = true;
        this._setChoroplethStyle();
      }
    }).error(function (e) {
      // notifier.fatal(e);
      // console.error(e);
    });
  }

  _setChoroplethStyle() {
    if (!this._choroplethMetrics) {
      return;
    }
    const styleFunction = makeChoroplethStyleFunction(this._choroplethMetrics, this._choroplethColorRamp, this._joinField);
    if (this._choroplethLeafletLayer) {
      this._choroplethLeafletLayer.setStyle(styleFunction);
    }
  }

  setChoroplethMetrics(metrics) {
    this._choroplethMetrics = metrics;
    this._setChoroplethStyle();
  }

  setChoroplethColorRamp(colorRamp) {
    if (_.isEqual(colorRamp, this._choroplethColorRamp)) {
      return;
    }
    this._choroplethColorRamp = colorRamp;
    this._setChoroplethStyle();
  }

  setCenter(latitude, longitude) {
    const latLong = L.latLng(latitude, longitude);
    if (latLong.equals && !latLong.equals(this._leafletMap.getCenter())) {
      this._leafletMap.setView(latLong);
    }
  }


  setZoomLevel(zoomLevel) {
    if (this._leafletMap.getZoom() !== zoomLevel) {
      this._leafletMap.setZoom(zoomLevel);
    }
  }

  getZoomLevel() {
    return this._leafletMap.getZoom();
  }

  getAutoPrecision() {
    //todo: not correct, should take into account settigns...
    return zoomToPrecision(this._leafletMap.getZoom(), 12);
  }

  getLeafletBounds() {
    return this._leafletMap.getBounds();
  }

  getBounds() {

    const bounds = this._leafletMap.getBounds();
    if (!bounds) {
      return null;
    }

    const southEast = bounds.getSouthEast();
    const northWest = bounds.getNorthWest();
    let southEastLng = southEast.lng;
    if (southEastLng > 180) {
      southEastLng -= 360;
    }
    let northWestLng = northWest.lng;
    if (northWestLng < -180) {
      northWestLng += 360;
    }

    const southEastLat = southEast.lat;
    const northWestLat = northWest.lat;

    //Bounds cannot be created unless they form a box with larger than 0 dimensions
    //Invalid areas are rejected by ES.
    if (southEastLat === northWestLat || southEastLng === northWestLng) {
      return;
    }

    return {
      bottom_right: {
        lat: southEastLat,
        lon: southEastLng
      },
      top_left: {
        lat: northWestLat,
        lon: northWestLng
      }
    };
  }


  setBaseLayer(settings) {
    if (settings === null) {
      if (this._leafletBaseLayer && this._leafletMap) {
        this._leafletMap.removeLayer(this._leafletBaseLayer);
      }
      return;
    }

    //
    if (settings.baseLayerType === 'wms') {
      this._setWMSBaseLayer(settings.options);
    } else {
      this._setTMSBaseLayer((settings.options));
    }


  }

  _setTMSBaseLayer(options) {
    if (!this._leafletBaseLayer) {
      this._leafletBaseLayer = L.tileLayer(options.url, {});
      this._leafletBaseLayer.addTo(this._leafletMap);
      this._leafletBaseLayer.bringToBack();
      this.resize();
      return;
    }

    //todo: make changes if settings change
  }

  _setWMSBaseLayer(options) {
    // console.log('todo: _setWMSBaseLayer', arguments);
  }

  addDrawControl() {
    const drawOptions = {
      draw: {
        polyline: false,
        marker: false,
        circle: false,
        polygon: false,
        rectangle: {
          shapeOptions: {
            stroke: false,
            color: '#000'
          }
        }
      }
    };
    this._leafletDrawControl = new L.Control.Draw(drawOptions);
    this._leafletMap.addControl(this._leafletDrawControl);
  }


  _recreateOverlay() {

    if (!this._featureCollection) {
      return;
    }

    if (this._geohashGridOverlay) {
      this._geohashGridOverlay.removeFromMap(this._leafletMap);
    }

    switch (this._geohashOptions.mapType) {
      case 'Scaled Circle Markers':
        this._geohashGridOverlay = new ScaledCircleOverlay(this._featureCollection, {}, this._leafletMap.getZoom());
        break;
      case 'Heatmap':
        this._geohashGridOverlay = new HeatmapOverlay(this._featureCollection, {
          radius: this._geohashOptions.heatmap.heatRadius,
          blur: this._geohashOptions.heatmap.heatBlur,
          maxZoom: this._geohashOptions.heatmap.heatMaxZoom,
          minOpaxity: this._geohashOptions.heatmap.heatMinOpacity,
          heatNormalizeData: this._geohashOptions.heatmap.heatNormalizeData
        });
        break;
      default:
        throw new Error(`${this._geohashOptions.mapType} mapType not recognized`);

    }

    this._geohashGridOverlay.addToLeafletMap(this._leafletMap);
    // this.fitIfNotVisible(this._featureCollection);

  }
  fitIfNotVisible(featureCollection) {
    const bounds = _.pluck(featureCollection.features, 'properties.rectangle');
    const mapBounds = this._leafletMap.getBounds();

    //layerbounds is sometimes empty:
    try {
      const layerbounds = this._geohashGridOverlay.getBounds();
      if (mapBounds && layerbounds && !mapBounds.intersects(layerbounds)) {
        this._leafletMap.fitBounds(bounds);
      }
    } catch (e) {
      //todo; shouldn't do this under zooming, only when play button is pressed.
    }
  }

  recreateGeohashOverlay() {
    this._recreateOverlay();
  }

  setGeohashFeatureCollection(featureCollection) {
    // if (this._geohashGridOverlay && _.isEqual(this._geohashGridOverlay.getFeatureCollection(), featureCollection)) {
    //   no need to recreate layer.
      // return;
    // }
    this._featureCollection = featureCollection;
    this._recreateOverlay();
  }

  setGeohashLayerOptions(options) {

    if (_.isEqual(this._geohashOptions, options)) {
      return;
    }

    const previousOptions = this._geohashOptions;
    this._geohashOptions = options;

    //do smart refresh. only required changes.
    if (previousOptions) {
      if (this._geohashOptions.mapType !== previousOptions.mapType) {
        this._recreateOverlay();
      } else if (this._geohashOptions.mapType === 'Heatmap' && !_.isEqual(this._geohashOptions.heatmap, previousOptions)) {
        this._recreateOverlay();//todo: can be optimized. does not require full refresh
      }
    }
    //todo: when other configurations change (tooltip, etc... do NOT recreate the layer

  }

  resize() {
    this._leafletMap.invalidateSize();
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

function makeStyleFunction(min, max, legendColors) {
  const quantizeDomain = (min !== max) ? [min, max] : d3.scale.quantize().domain();
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

function makeChoroplethStyleFunction(data, colorramp, joinField) {

  if (data.length === 0) {
    return function () {
      return emptyStyle();
    };
  }

  let min = data[0].value;
  let max = data[0].value;
  for (let i = 1; i < data.length; i += 1) {
    min = Math.min(data[i].value, min);
    max = Math.max(data[i].value, max);
  }

  return function (geojsonFeature) {

    const match = data.find((bucket) => {
      return bucket.term === geojsonFeature.properties[joinField];
    });

    if (!match) {
      return emptyStyle();
    }

    return {
      fillColor: getChoroplethColor(match.value, min, max, colorramp),
      weight: 2,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

}

function getChoroplethColor(value, min, max, colorRamp) {
  if (min === max) {
    return colorRamp[colorRamp.length - 1];
  }
  const fraction = (value - min) / (max - min);
  const index = Math.round(colorRamp.length * fraction) - 1;
  const i = Math.max(Math.min(colorRamp.length - 1, index), 0);

  const color = colorRamp[i][1];
  const red = Math.floor(color[0] * 255);
  const green = Math.floor(color[1] * 255);
  const blue = Math.floor(color[2] * 255);
  return `rgb(${red},${green},${blue})`;
}


const emptyStyleObject = {
  weight: 1,
  opacity: 0.6,
  color: 'rgb(200,200,200)',
  fillOpacity: 0
};
function emptyStyle() {
  return emptyStyleObject;
}

export default KibanaMap;
