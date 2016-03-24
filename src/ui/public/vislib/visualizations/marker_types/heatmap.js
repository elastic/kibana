import d3 from 'd3';
import _ from 'lodash';
import L from 'leaflet';
import VislibVisualizationsMarkerTypesBaseMarkerProvider from 'ui/vislib/visualizations/marker_types/base_marker';
export default function HeatmapMarkerFactory(Private) {

  var BaseMarker = Private(VislibVisualizationsMarkerTypesBaseMarkerProvider);

  /**
   * Map overlay: canvas layer with leaflet.heat plugin
   *
   * @param map {Leaflet Object}
   * @param geoJson {geoJson Object}
   * @param params {Object}
   */
  _.class(HeatmapMarker).inherits(BaseMarker);
  function HeatmapMarker(map, geoJson, params) {
    var self = this;
    this._disableTooltips = false;
    HeatmapMarker.Super.apply(this, arguments);

    this._createMarkerGroup({
      radius: +this._attr.heatRadius,
      blur: +this._attr.heatBlur,
      maxZoom: +this._attr.heatMaxZoom,
      minOpacity: +this._attr.heatMinOpacity
    });
  }

  /**
   * Does nothing, heatmaps don't have a legend
   *
   * @method addLegend
   * @return {undefined}
   */
  HeatmapMarker.prototype.addLegend = _.noop;

  HeatmapMarker.prototype._createMarkerGroup = function (options) {
    var max = _.get(this.geoJson, 'properties.allmax');
    var points = this._dataToHeatArray(max);

    this._markerGroup = L.heatLayer(points, options);
    this._fixTooltips();
    this._addToMap();
  };

  HeatmapMarker.prototype._fixTooltips = function () {
    var self = this;
    var debouncedMouseMoveLocation = _.debounce(mouseMoveLocation.bind(this), 15, {
      'leading': true,
      'trailing': false
    });

    if (!this._disableTooltips && this._attr.addTooltip) {
      this.map.on('mousemove', debouncedMouseMoveLocation);
      this.map.on('mouseout', function () {
        self.map.closePopup();
      });
      this.map.on('mousedown', function () {
        self._disableTooltips = true;
        self.map.closePopup();
      });
      this.map.on('mouseup', function () {
        self._disableTooltips = false;
      });
    }

    function mouseMoveLocation(e) {
      var latlng = e.latlng;

      this.map.closePopup();

      // unhighlight all svgs
      d3.selectAll('path.geohash', this.chartEl).classed('geohash-hover', false);

      if (!this.geoJson.features.length || this._disableTooltips) {
        return;
      }

      // find nearest feature to event latlng
      var feature = this._nearestFeature(latlng);

      // show tooltip if close enough to event latlng
      if (this._tooltipProximity(latlng, feature)) {
        this._showTooltip(feature, latlng);
      }
    }
  };

  /**
   * returns a memoized Leaflet latLng for given geoJson feature
   *
   * @method addLatLng
   * @param feature {geoJson Object}
   * @return {Leaflet latLng Object}
   */
  HeatmapMarker.prototype._getLatLng = _.memoize(function (feature) {
    return L.latLng(
      feature.geometry.coordinates[1],
      feature.geometry.coordinates[0]
    );
  }, function (feature) {
    // turn coords into a string for the memoize cache
    return [feature.geometry.coordinates[1], feature.geometry.coordinates[0]].join(',');
  });

  /**
   * Finds nearest feature in mapData to event latlng
   *
   * @method _nearestFeature
   * @param latLng {Leaflet latLng}
   * @return nearestPoint {Leaflet latLng}
   */
  HeatmapMarker.prototype._nearestFeature = function (latLng) {
    var self = this;
    var nearest;

    if (latLng.lng < -180 || latLng.lng > 180) {
      return;
    }

    _.reduce(this.geoJson.features, function (distance, feature) {
      var featureLatLng = self._getLatLng(feature);
      var dist = latLng.distanceTo(featureLatLng);

      if (dist < distance) {
        nearest = feature;
        return dist;
      }

      return distance;
    }, Infinity);

    return nearest;
  };

  /**
   * Returns the domain for the heatmap scale
   *
   * @method _getDomain
   * @param features {geoJson Object}
   * @param scaleType {String}
   * @param callback {Function}
   * @return {Array}
   */
  HeatmapMarker.prototype._getDomain = function (features, scaleType, callback) {
    var isLog = Boolean(scaleType === 'log');
    var extent = d3.extent(features, callback);

    // Log scales cannot have numbers <= 0. Default min value is 1e-9 and max value is 1.
    if (isLog) return [ Math.max(1e-9, extent[0]), Math.max(1, extent[1]) ];
    return extent;
  };

  /**
   * Returns a scale function which determines the heatmap intensity at a given
   * point. Linear scale by default.
   *
   * @method _heatmapScale
   * @param features {Array}
   * @param scaleType {String}
   * @param callback {Function}
   * @return {Function}
   */
  HeatmapMarker.prototype._heatmapScale = function (features, scaleType, callback) {
    return d3.scale[scaleType]()
    .domain(this._getDomain(features, scaleType, callback))
    .range([0, 1]) // Heatmap plugin expects output between 0 and 1
    .clamp(true); // Clamps the output to keep it between 0 and 1
  };

  /**
   * returns data for data for heat map intensity
   *
   * @method _dataToHeatArray
   * @return {Array}
   */
  HeatmapMarker.prototype._dataToHeatArray = function () {
    var scaleType = this._attr.intensityScale || 'linear';
    var features = this.geoJson.features;
    var intensityScale = this._heatmapScale(features, scaleType, function (d) {
      return scaleType === 'log' ? Math.abs(d.properties.value) : d.properties.value;
    });

    return features.map(function (feature) {
      var lat = feature.properties.center[0];
      var lng = feature.properties.center[1];
      var heatIntensity = intensityScale(feature.properties.value);

      return [lat, lng, heatIntensity];
    });
  };

  /**
   * display tooltip if feature is close enough to event latlng
   *
   * @method _tooltipProximity
   * @param latlng {Leaflet latLng  Object}
   * @param feature {geoJson Object}
   * @return {Boolean}
   */
  HeatmapMarker.prototype._tooltipProximity = function (latlng, feature) {
    if (!feature) return;

    var showTip = false;
    var featureLatLng = this._getLatLng(feature);

    // zoomScale takes map zoom and returns proximity value for tooltip display
    // domain (input values) is map zoom (min 1 and max 18)
    // range (output values) is distance in meters
    // used to compare proximity of event latlng to feature latlng
    var zoomScale = d3.scale.linear()
    .domain([1, 4, 7, 10, 13, 16, 18])
    .range([1000000, 300000, 100000, 15000, 2000, 150, 50]);

    var proximity = zoomScale(this.map.getZoom());
    var distance = latlng.distanceTo(featureLatLng);

    // maxLngDif is max difference in longitudes
    // to prevent feature tooltip from appearing 360°
    // away from event latlng
    var maxLngDif = 40;
    var lngDif = Math.abs(latlng.lng - featureLatLng.lng);

    if (distance < proximity && lngDif < maxLngDif) {
      showTip = true;
    }

    var testScale = d3.scale.pow().exponent(0.2)
    .domain([1, 18])
    .range([1500000, 50]);

    return showTip;
  };

  return HeatmapMarker;
};
