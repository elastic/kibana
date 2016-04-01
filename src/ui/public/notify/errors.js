define(function (require) {
  let errors = {};
  let _ = require('lodash');

  let canStack = (function () {
    let err = new Error();
    return !!err.stack;
  }());

  // abstract error class
  _.class(KibanaError).inherits(Error);
  function KibanaError(msg, constructor) {
    this.message = msg;

    Error.call(this, this.message);
    if (!this.stack) {
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, constructor || KibanaError);
      } else if (canStack) {
        this.stack = (new Error()).stack;
      } else {
        this.stack = '';
      }
    }
  }
  errors.KibanaError = KibanaError;

  return errors;
});
