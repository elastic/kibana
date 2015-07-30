define(function () {
  return function MappedColorFactory() {

    var _ = require('lodash');
    /*
     * Maintains a lookup table that associates the value (key) with a hex color (value)
     * across the visualizations.
     * Provides functions to interact with the lookup table
     */

    var MappedColorService = function () {
    };

    MappedColorService.colors = {};
    /**
     * Allows to add value (key) and color (value) to the lookup table
     *
     * @method add
     * @param {String} key - the value in a visualization
     * @param {String} value - the color associated with the value
     */
    MappedColorService.prototype.add = function (key, value) {
      MappedColorService.colors[key] = value;
    };

    /**
     * Provides the color (value) associated with the value (key)
     *
     * @method get
     * @param {String} key - the value for which color is required
     * @returns the color associated with the value
     */
    MappedColorService.prototype.get = function (key) {
      return MappedColorService.colors[key];
    };

    /**
     * Size of the mapped colors
     *
     * @method count
     * @returns the number of values (keys) stored in the lookup table
     */
    MappedColorService.prototype.count = function () {
      return _.keys(MappedColorService.colors).length;
    };

    /**
     * All the colors of in the lookup table
     *
     * @method all
     * @returns all the colors used in the lookup table
     */
    MappedColorService.prototype.all = function () {
      return _.values(MappedColorService.colors);
    };

    MappedColorService.prototype.reset = function () {
      MappedColorService.colors = {};
    };

    return MappedColorService;
  };
});
