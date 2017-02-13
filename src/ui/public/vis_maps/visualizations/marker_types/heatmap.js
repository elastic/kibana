import d3 from 'd3';
import _ from 'lodash';
import L from 'leaflet';
import VislibVisualizationsMarkerTypesBaseMarkerProvider from './base_marker';
export default function HeatmapMarkerFactory(Private) {

  const BaseMarker = Private(VislibVisualizationsMarkerTypesBaseMarkerProvider);

  /**
   * Map overlay: canvas layer with leaflet.heat plugin
   *
   * @param map {Leaflet Object}
   * @param geoJson {geoJson Object}
   * @param params {Object}
   */
  class HeatmapMarker extends BaseMarker {
    constructor(map, geoJson, params) {
      super(map, geoJson, params);
      this._disableTooltips = false;

      this._createMarkerGroup({
        radius: +this._attr.heatRadius,
        blur: +this._attr.heatBlur,
        maxZoom: +this._attr.heatMaxZoom,
        minOpacity: +this._attr.heatMinOpacity
      });

      this.addLegend = _.noop;

      this._getLatLng = _.memoize(function (feature) {
        return L.latLng(
          feature.geometry.coordinates[1],
          feature.geometry.coordinates[0]
        );
      }, function (feature) {
        // turn coords into a string for the memoize cache
        return [feature.geometry.coordinates[1], feature.geometry.coordinates[0]].join(',');
      });
    }

    _createMarkerGroup(options) {
      const max = _.get(this.geoJson, 'properties.allmax');
      const points = this._dataToHeatArray(max);

      this._markerGroup = L.heatLayer(points, options);
      this._fixTooltips();
      this._addToMap();
    }

    _fixTooltips() {
      const self = this;
      const debouncedMouseMoveLocation = _.debounce(mouseMoveLocation.bind(this), 15, {
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
        const latlng = e.latlng;

        this.map.closePopup();

        // unhighlight all svgs
        d3.selectAll('path.geohash', this.chartEl).classed('geohash-hover', false);

        if (!this.geoJson.features.length || this._disableTooltips) {
          return;
        }

        // find nearest feature to event latlng
        const feature = this._nearestFeature(latlng);

        // show tooltip if close enough to event latlng
        if (this._tooltipProximity(latlng, feature)) {
          this._showTooltip(feature, latlng);
        }
      }
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

      _.reduce(this.geoJson.features, function (distance, feature) {
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

      const proximity = zoomScale(this.map.getZoom());
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


    /**
     * returns data for data for heat map intensity
     * if heatNormalizeData attribute is checked/true
     • normalizes data for heat map intensity
     *
     * @method _dataToHeatArray
     * @param max {Number}
     * @return {Array}
     */
    _dataToHeatArray(max) {
      const self = this;

      return this.geoJson.features.map(function (feature) {
        const lat = feature.geometry.coordinates[1];
        const lng = feature.geometry.coordinates[0];
        let heatIntensity;

        if (!self._attr.heatNormalizeData) {
          // show bucket value on heatmap
          heatIntensity = feature.properties.value;
        } else {
          // show bucket value normalized to max value
          heatIntensity = feature.properties.value / max;
        }

        return [lat, lng, heatIntensity];
      });
    }
  }


  return HeatmapMarker;
}
