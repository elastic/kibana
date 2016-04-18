define(function (require) {
  let _ = require('lodash');
  let rison = require('ui/utils/rison');
  let angular = require('angular');

  function BaseObject(attributes) {
    // Set the attributes or default to an empty object
    _.assign(this, attributes);
  }

  /**
   * Returns the attirbutes for the objct
   * @returns {object}
   */
  BaseObject.prototype.toObject = function () {
    // return just the data.
    return _.omit(this, function (value, key) {
      return key.charAt(0) === '$' || key.charAt(0) === '_' || _.isFunction(value);
    });
  };

  /**
   * Serialize the model to RISON
   * @returns {string}
   */
  BaseObject.prototype.toRISON = function () {
    // Use Angular to remove the private vars, and JSON.stringify to serialize
    return rison.encode(JSON.parse(angular.toJson(this)));
  };

  /**
   * Serialize the model to JSON
   * @returns {object}
   */
  BaseObject.prototype.toJSON = function () {
    return this.toObject();
  };

  return BaseObject;
});
