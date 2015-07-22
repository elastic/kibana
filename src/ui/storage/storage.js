define(function (require) {
  var modules = require('ui/modules');
  var angular = require('angular');

  function Storage(store) {
    var self = this;
    self.store = store;

    self.get = function (key) {
      try {
        return JSON.parse(self.store.getItem(key));
      } catch (e) {
        return null;
      }
    };

    self.set = function (key, value) {
      try {
        return self.store.setItem(key, angular.toJson(value));
      } catch (e) {
        return false;
      }
    };

    self.remove = function (key) {
      return self.store.removeItem(key);
    };

    self.clear = function () {
      return self.store.clear();
    };
  }

  var createService = function (type) {
    return function ($window) {
      return new Storage($window[type]);
    };
  };

  modules.get('kibana/storage')
    .service('localStorage', createService('localStorage'))
    .service('sessionStorage', createService('sessionStorage'));
});