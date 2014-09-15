define(function (require) {

  var angular = require('angular');
  angular.module('ErrorHandlerFactory', ['kibana']);

  describe('VisLib ErrorHandler Test Suite', function () {
    var ErrorHandler;
    var errorHandler;

    beforeEach(function () {
      module('ErrorHandlerFactory');
    });

    beforeEach(function () {
      inject(function (Private) {
        ErrorHandler = Private(require('components/vislib/lib/_error_handler'));
        errorHandler = new ErrorHandler();
      });
    });

    describe('validateWidthandHeight Method', function () {
      it('should throw an error when width and/or height is 0', function () {
        expect(function () {
          errorHandler.validateWidthandHeight(0, 200);
        }).to.throwError();
        expect(function () {
          errorHandler.validateWidthandHeight(200, 0);
        }).to.throwError();
      });

      it('should throw an error when width and/or height is NaN', function () {
        expect(function () {
          errorHandler.validateWidthandHeight(null, 200);
        }).to.throwError();
        expect(function () {
          errorHandler.validateWidthandHeight(200, null);
        }).to.throwError();
      });
    });

  });
});
