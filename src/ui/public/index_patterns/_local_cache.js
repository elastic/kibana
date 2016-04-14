define(function (require) {
  let _ = require('lodash');
  let angular = require('angular');

  return function LocalCacheFactory() {
    function LocalCache(opts) {
      opts = opts || {};
      let _id = opts.id || function (o) { return '' + o; };
      let _cache = {};

      this.get = function (obj) {
        let id = _id(obj);
        return _cache[id] ? JSON.parse(_cache[id]) : null;
      };

      this.set = function (obj, val) {
        let id = _id(obj);
        let clean = !_cache.hasOwnProperty(id);
        _cache[id] = angular.toJson(val);
        return clean;
      };

      this.clear = function (obj) {
        if (!obj) {
          _cache = {};
          return;
        }

        let id = _id(obj);
        delete _cache[id];
      };
    }

    return LocalCache;
  };

});
