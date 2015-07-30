define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');

  return function (target, source) {

    var diff = {};

    /**
     * Filter the private vars
     * @param {string} key The keys
     * @returns {boolean}
     */
    var filterPrivateAndMethods = function (obj) {
      return function (key) {
        if (_.isFunction(obj[key])) return false;
        if (key.charAt(0) === '$') return false;
        return key.charAt(0) !== '_';
      };
    };

    var targetKeys = _.keys(target).filter(filterPrivateAndMethods(target));
    var sourceKeys = _.keys(source).filter(filterPrivateAndMethods(source));

    // Find the keys to be removed
    diff.removed = _.difference(targetKeys, sourceKeys);

    // Find the keys to be added
    diff.added = _.difference(sourceKeys, targetKeys);

    // Find the keys that will be changed
    diff.changed = _.filter(sourceKeys, function (key) {
      return !angular.equals(target[key], source[key]);
    });

    // Make a list of all the keys that are changing
    diff.keys = _.union(diff.changed, diff.removed, diff.added);

    // Remove all the keys
    _.each(diff.removed, function (key) {
      delete target[key];
    });

    // Assign the changed to the source to the target
    _.assign(target, _.pick(source, diff.changed));
    // Assign the added to the source to the target
    _.assign(target, _.pick(source, diff.added));

    return diff;

  };
});
