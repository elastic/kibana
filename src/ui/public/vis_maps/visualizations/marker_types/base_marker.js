import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import L from 'leaflet';
export default function MarkerFactory() {

  /**
   * Base map marker overlay, all other markers inherit from this class
   *
   * @param map {Leaflet Object}
   * @param geoJson {geoJson Object}
   * @param params {Object}
   */
  class BaseMarker {
    constructor(map, geoJson, params) {
      this.map = map;
      this.geoJson = geoJson;
      this.popups = [];

      this._tooltipFormatter = params.tooltipFormatter || null;
      this._valueFormatter = params.valueFormatter || _.identity;
      this._attr = params.attr || {};

      // set up the default legend colors
      this.quantizeLegendColors();
    }

    getLabel() {
      if (this.popups.length) {
        return this.popups[0].feature.properties.aggConfigResult.aggConfig.makeLabel();
      }
      return '';
    }
    /**
     * Adds legend div to each map when data is split
     * uses d3 scale from BaseMarker.prototype.quantizeLegendColors
     *
     * @method addLegend
     * @return {undefined}
     */
    addLegend() {
      // ensure we only ever create 1 legend
      if (this._legend) return;

      const self = this;

      // create the legend control, keep a reference
      self._legend = L.control({ position: this._attr.legendPosition });

      self._legend.onAdd = function () {
        // creates all the neccessary DOM elements for the control, adds listeners
        // on relevant map events, and returns the element containing the control
        const $wrapper = $('<div>').addClass('tilemap-legend-wrapper');
        const $div = $('<div>').addClass('tilemap-legend');
        $wrapper.append($div);

        const titleText = self.getLabel();
        const $title = $('<div>').addClass('tilemap-legend-title').text(titleText);
        $div.append($title);

        _.each(self._legendColors, function (color, i) {
          const labelText = self._legendQuantizer
          .invertExtent(color)
          .map(self._valueFormatter)
          .join(' – ');

          const label = $('<div>');

          const icon = $('<i>').css({
            background: color,
            'border-color': self.darkerColor(color)
          });

          const text = $('<span>').text(labelText);

          label.append(icon);
          label.append(text);
          $div.append(label);
        });

        return $wrapper.get(0);
      };

      self._legend.addTo(self.map);
    }

    /**
     * Apply style with shading to feature
     *
     * @method applyShadingStyle
     * @param value {Object}
     * @return {Object}
     */
    applyShadingStyle(value) {
      const color = this._legendQuantizer(value);

      return {
        fillColor: color,
        color: this.darkerColor(color),
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.75
      };
    }

    /**
     * Binds popup and events to each feature on map
     *
     * @method bindPopup
     * @param feature {Object}
     * @param layer {Object}
     * return {undefined}
     */
    bindPopup(feature, layer) {
      const self = this;

      const popup = layer.on({
        mouseover: function (e) {
          const layer = e.target;
          // bring layer to front if not older browser
          if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
          }
          self._showTooltip(feature);
        },
        mouseout: function () {
          self._hidePopup();
        }
      });

      self.popups.push(popup);
    }

    /**
     * d3 method returns a darker hex color,
     * used for marker stroke color
     *
     * @method darkerColor
     * @param color {String} hex color
     * @param amount? {Number} amount to darken by
     * @return {String} hex color
     */
    darkerColor(color, amount) {
      amount = amount || 1.3;
      return d3.hcl(color).darker(amount).toString();
    }

    destroy() {
      const self = this;

      // remove popups
      self.popups = self.popups.filter(function (popup) {
        popup.off('mouseover').off('mouseout');
      });

      if (self._legend) {
        self.map.removeControl(self._legend);
        self._legend = undefined;
      }

      // remove marker layer from map
      if (self._markerGroup) {
        self.map.removeLayer(self._markerGroup);
        self._markerGroup = undefined;
      }
    }

    _addToMap() {
      this.map.addLayer(this._markerGroup);
    }

    /**
     * Creates leaflet marker group, passing options to L.geoJson
     *
     * @method _createMarkerGroup
     * @param options {Object} Options to pass to L.geoJson
     */
    _createMarkerGroup(options) {
      const self = this;
      const defaultOptions = {
        onEachFeature: function (feature, layer) {
          self.bindPopup(feature, layer);
        },
        style: function (feature) {
          const value = _.get(feature, 'properties.value');
          return self.applyShadingStyle(value);
        },
        filter: self._filterToMapBounds()
      };

      this._markerGroup = L.geoJson(this.geoJson, _.defaults(defaultOptions, options));
      this._addToMap();
    }

    /**
     * return whether feature is within map bounds
     *
     * @method _filterToMapBounds
     * @param map {Leaflet Object}
     * @return {boolean}
     */
    _filterToMapBounds() {
      const self = this;
      return function (feature) {
        const mapBounds = self.map.getBounds();
        const bucketRectBounds = _.get(feature, 'properties.rectangle');
        return mapBounds.intersects(bucketRectBounds);
      };
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
      const hasMap = !!this.map;
      const hasTooltip = !!this._attr.addTooltip;
      if (!hasMap || !hasTooltip) {
        return;
      }
      const lat = _.get(feature, 'geometry.coordinates.1');
      const lng = _.get(feature, 'geometry.coordinates.0');

      latLng = latLng || L.latLng(lat, lng);

      const content = this._tooltipFormatter(feature);

      if (!content) return;
      this._createTooltip(content, latLng);
    }

    _getOffset(content, latLng) {
      // Default maxWidth leaflet applies to popup is 300
      const popupWidth = 300;

      // We need to create the popup first to determine how tall it will be.  Give
      // it an out of map bounds offset as we don't want to see this one.  It will
      // get replaced on the next popup creation where we apply the correct offset
      const popup = L.popup({ autoPan: false, offset: new L.Point(this.map.getSize().x * 2, this.map.getSize().y * 2) })
      .setLatLng(latLng)
      .setContent(content)
      .openOn(this.map);
      const popupHeight = popup._contentNode.clientHeight;

      const east = this.map.getBounds().getEast();
      const west = this.map.getBounds().getWest();
      const north = this.map.getBounds().getNorth();
      const south = this.map.getBounds().getSouth();
      const width = Math.abs(east - west);
      const height = Math.abs(north - south);
      const xscale = this.map.getSize().x / width;
      const yscale = this.map.getSize().y / height;

      const popupDistanceToLeftEdge = Math.abs(latLng.lng - west) * xscale;
      const popupDistanceToRightEdge = Math.abs(latLng.lng - east) * xscale;
      let widthOffset = 0;
      if (popupDistanceToLeftEdge < popupWidth / 2) {
        widthOffset = popupWidth / 2;
      }
      else if (popupDistanceToRightEdge < popupWidth / 2) {
        widthOffset = -popupWidth / 2;
      }

      // Default height offset leaflet applies to popup is 6
      let heightOffset = 6;
      const popupDistanceToTopEdge = Math.abs(latLng.lat - north) * yscale;
      if (popupDistanceToTopEdge < popupHeight + heightOffset) {
        // 16 is the margin-bottom style that was added to the leaflet-popup in _tilemap.less
        heightOffset += popupHeight + 16;
      }

      return new L.Point(widthOffset, heightOffset);
    }

    _createTooltip(content, latLng) {
      L.popup({ autoPan: false, offset: this._getOffset(content, latLng) })
      .setLatLng(latLng)
      .setContent(content)
      .openOn(this.map);
    }

    /**
     * Closes the tooltip on the map
     *
     * @method _hidePopup
     * @return undefined
     */
    _hidePopup() {
      if (!this.map) return;

      this.map.closePopup();
    }

    /**
     * d3 quantize scale returns a hex color, used for marker fill color
     *
     * @method quantizeLegendColors
     * return {undefined}
     */
    quantizeLegendColors() {
      const min = _.get(this.geoJson, 'properties.allmin', 0);
      const max = _.get(this.geoJson, 'properties.allmax', 1);
      const quantizeDomain = (min !== max) ? [min, max] : d3.scale.quantize().domain();

      const reds1 = ['#ff6128'];
      const reds3 = ['#fecc5c', '#fd8d3c', '#e31a1c'];
      const reds5 = ['#fed976', '#feb24c', '#fd8d3c', '#f03b20', '#bd0026'];
      const bottomCutoff = 2;
      const middleCutoff = 24;

      if (max - min <= bottomCutoff) {
        this._legendColors = reds1;
      } else if (max - min <= middleCutoff) {
        this._legendColors = reds3;
      } else {
        this._legendColors = reds5;
      }

      this._legendQuantizer = d3.scale.quantize().domain(quantizeDomain).range(this._legendColors);
    }
  }

  return BaseMarker;
}
