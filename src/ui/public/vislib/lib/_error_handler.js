define(function (require) {
  let _ = require('lodash');
  let errors = require('ui/errors');

  return function ErrorHandlerFactory() {

    /**
     * Common errors shared between constructors
     *
     * @class ErrorHandler
     * @constructor
     */
    function ErrorHandler() {}

    /**
     * Validates the height and width are > 0
     * min size must be at least 1 px
     *
     * @method validateWidthandHeight
     * @param width {Number} HTMLElement width
     * @param height {Number} HTMLElement height
     * @returns {HTMLElement} HTML div with an error message
     */
    ErrorHandler.prototype.validateWidthandHeight = function (width, height) {
      let badWidth = _.isNaN(width) || width <= 0;
      let badHeight = _.isNaN(height) || height <= 0;

      if (badWidth || badHeight) {
        throw new errors.ContainerTooSmall();
      }
    };

    return ErrorHandler;
  };
});
