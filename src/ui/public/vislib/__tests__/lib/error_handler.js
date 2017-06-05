
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VislibLibErrorHandlerProvider } from 'ui/vislib/lib/_error_handler';

describe('Vislib ErrorHandler Test Suite', function () {
  let ErrorHandler;
  let errorHandler;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    ErrorHandler = Private(VislibLibErrorHandlerProvider);
    errorHandler = new ErrorHandler();
  }));

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
