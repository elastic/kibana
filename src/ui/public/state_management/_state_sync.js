define(function (require) {

  let angular = require('angular');
  let _ = require('lodash');
  let rison = require('ui/utils/rison');

  // invokable/private angular dep
  return function ($location) {
    // feed in some of the private state from globalState
    return function (globalState, updateListeners, app) {
      let getAppStash = function (search) {
        let appStash = search._a && rison.decode(search._a);
        if (app.current) {
          // Apply the defaults to appStash
          appStash = _.defaults(appStash || {}, app.defaults);
        }
        return appStash;
      };

      let diffTrans = function (trans) {
        let obj = trans[0];
        let update = trans[1];

        let diff = {};

        // the keys that are currently set on obj, excluding methods
        let objKeys = Object.keys(obj).filter(function (key) {
          return typeof obj[key] !== 'function';
        });

        if (update) {
          // the keys obj should have after applying the update
          let updateKeys = diff.keys = Object.keys(update).filter(function (key) {
            return typeof update[key] !== 'function';
          });

          // the keys that will be removed
          diff.remove = _.difference(objKeys, updateKeys);

          // list of keys that will be added or changed
          diff.change = updateKeys.filter(function (key) {
            return !angular.equals(obj[key], update[key]);
          });
        } else {
          diff.keys = objKeys.slice(0);
          diff.remove = [];
          diff.change = [];
        }

        // single list of all keys that are effected
        diff.all = [].concat(diff.remove, diff.change);

        return diff;
      };

      let notify = function (trans, diff) {
        let listeners = null;

        if (trans[0] === app.current) {
          listeners = app.listeners;
        } else if (trans[0] === globalState) {
          listeners = updateListeners;
        }

        listeners && listeners.splice(0).forEach(function (defer) {
          defer.resolve(diff.all.slice(0));
        });
      };

      let applyDiff = function (trans, diff) {
        if (!diff.all.length) return;

        let obj = trans[0];
        let update = trans[1];

        diff.remove.forEach(function (key) {
          delete obj[key];
        });

        diff.change.forEach(function (key) {
          obj[key] = update[key];
        });
      };

      let syncTrans = function (trans, forceNotify) {
        // obj that will be modified by update(trans[1])
        // if it is empty, we can skip it all
        let skipWrite = !trans[0];
        trans[0] = trans[0] || {};

        let diff = diffTrans(trans);
        if (!skipWrite && (forceNotify || diff.all.length)) {
          applyDiff(trans, diff);
          notify(trans, diff);
        }
        return diff;
      };

      return {
        // sync by pushing to the url
        push: function (forceNotify) {
          let search = $location.search();

          let appStash = getAppStash(search) || {};
          let globalStash = search._g ? rison.decode(search._g) : {};

          let res = _.mapValues({
            app: [appStash, app.current],
            global: [globalStash, globalState]
          }, function (trans, key) {
            let diff = syncTrans(trans, forceNotify);
            let urlKey = '_' + key.charAt(0);
            if (diff.keys.length === 0) {
              delete search[urlKey];
            } else {
              search[urlKey] = rison.encode(trans[0]);
            }
            return diff;
          });

          $location.search(search);
          return res;
        },
        // sync by pulling from the url
        pull: function (forceNotify) {
          let search = $location.search();

          let appStash = getAppStash(search);
          let globalStash = search._g && rison.decode(search._g);

          return _.mapValues({
            app: [app.current, appStash],
            global: [globalState, globalStash]
          }, function (trans) {
            return syncTrans(trans, forceNotify);
          });
        }
      };
    };
  };
});
