define(function (require) {
  return function PatternCache() {
    var _ = require('lodash');

    var vals = {};

    var validId = function (id) {
      return typeof id !== 'object';
    };

    this.get = function (id) {
      if (validId(id)) return vals[id];
    };

    this.set = function (id, prom) {
      if (validId(id)) vals[id] = prom;
      return prom;
    };

    this.clear = this.delete = function (id) {
      if (validId(id)) delete vals[id];
    };
  };
});