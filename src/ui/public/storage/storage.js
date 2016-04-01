define(function (require) {
  let modules = require('ui/modules');
  let angular = require('angular');

  function Storage(store) {
    let self = this;
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

  let createService = function (type) {
    return function ($window) {
      return new Storage($window[type]);
    };
  };

  modules.get('kibana/storage')
    .service('localStorage', createService('localStorage'))
    .service('sessionStorage', createService('sessionStorage'));
});
