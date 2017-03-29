import angular from 'angular';

export default function LocalCacheFactory() {
  function LocalCache(opts) {
    opts = opts || {};
    const _id = opts.id || function (o) { return '' + o; };
    let _cache = {};

    this.get = function (obj) {
      const id = _id(obj);
      return _cache[id] ? JSON.parse(_cache[id]) : null;
    };

    this.set = function (obj, val) {
      const id = _id(obj);
      const clean = !_cache.hasOwnProperty(id);
      _cache[id] = angular.toJson(val);
      return clean;
    };

    this.clear = function (obj) {
      if (!obj) {
        _cache = {};
        return;
      }

      const id = _id(obj);
      delete _cache[id];
    };
  }

  return LocalCache;
}

