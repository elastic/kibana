import _ from 'lodash';
import { ContainerTooSmall } from 'ui/errors';

export default function ErrorHandlerFactory() {

  /**
   * Common errors shared between constructors
   *
   * @class ErrorHandler
   * @constructor
   */
  class ErrorHandler {
    constructor() {

    }

    /**
     * Validates the height and width are > 0
     * min size must be at least 1 px
     *
     * @method validateWidthandHeight
     * @param width {Number} HTMLElement width
     * @param height {Number} HTMLElement height
     * @returns {HTMLElement} HTML div with an error message
     */
    validateWidthandHeight(width, height) {
      const badWidth = _.isNaN(width) || width <= 0;
      const badHeight = _.isNaN(height) || height <= 0;

      if (badWidth || badHeight) {
        throw new ContainerTooSmall();
      }
    }
  }

  return ErrorHandler;
}
