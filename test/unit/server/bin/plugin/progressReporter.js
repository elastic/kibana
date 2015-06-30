var root = require('requirefrom')('');
var expect = require('expect.js');
var sinon = require('sinon');
var progressReporter = root('src/server/bin/plugin/progressReporter');
var pluginLogger = root('src/server/bin/plugin/pluginLogger');

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('progressReporter', function () {

      var logger;
      var progress;
      var request;
      beforeEach(function () {
        logger = pluginLogger(false);
        sinon.stub(logger, 'log');
        sinon.stub(logger, 'error');
        request = {
          abort: sinon.stub(),
          emit: sinon.stub()
        };
        progress = progressReporter(logger, request);
      });

      afterEach(function () {
        logger.log.restore();
        logger.error.restore();
      });

      describe('handleResponse', function () {

        describe('bad response codes', function () {

          it('should set the state to error for response code = 400', function () {
            progress.handleResponse({ statusCode: 400 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 401', function () {
            progress.handleResponse({ statusCode: 401 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 402', function () {
            progress.handleResponse({ statusCode: 402 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 403', function () {
            progress.handleResponse({ statusCode: 403 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 404', function () {
            progress.handleResponse({ statusCode: 404 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 405', function () {
            progress.handleResponse({ statusCode: 405 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 406', function () {
            progress.handleResponse({ statusCode: 406 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 407', function () {
            progress.handleResponse({ statusCode: 407 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 408', function () {
            progress.handleResponse({ statusCode: 408 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 409', function () {
            progress.handleResponse({ statusCode: 409 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 410', function () {
            progress.handleResponse({ statusCode: 410 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 411', function () {
            progress.handleResponse({ statusCode: 411 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 412', function () {
            progress.handleResponse({ statusCode: 412 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 413', function () {
            progress.handleResponse({ statusCode: 413 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 414', function () {
            progress.handleResponse({ statusCode: 414 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 415', function () {
            progress.handleResponse({ statusCode: 415 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 416', function () {
            progress.handleResponse({ statusCode: 416 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 417', function () {
            progress.handleResponse({ statusCode: 417 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 500', function () {
            progress.handleResponse({ statusCode: 500 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 501', function () {
            progress.handleResponse({ statusCode: 501 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 502', function () {
            progress.handleResponse({ statusCode: 502 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 503', function () {
            progress.handleResponse({ statusCode: 503 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 504', function () {
            progress.handleResponse({ statusCode: 504 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

          it('should set the state to error for response code = 505', function () {
            progress.handleResponse({ statusCode: 505 });

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(true);
              expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
            });
          });

        });

        describe('good response codes', function () {

          it('should set the state to error for response code = 200', function () {
            progress.handleResponse({ statusCode: 200, headers: { 'content-length': 1000 } });
            progress.handleEnd();

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(false);
              expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/1000/);
            });
          });

          it('should set the state to error for response code = 201', function () {
            progress.handleResponse({ statusCode: 201, headers: { 'content-length': 1000 } });
            progress.handleEnd();

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(false);
              expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/1000/);
            });
          });

          it('should set the state to error for response code = 202', function () {
            progress.handleResponse({ statusCode: 202, headers: { 'content-length': 1000 } });
            progress.handleEnd();

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(false);
              expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/1000/);
            });
          });

          it('should set the state to error for response code = 203', function () {
            progress.handleResponse({ statusCode: 203, headers: { 'content-length': 1000 } });
            progress.handleEnd();

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(false);
              expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/1000/);
            });
          });

          it('should set the state to error for response code = 204', function () {
            progress.handleResponse({ statusCode: 204, headers: { 'content-length': 1000 } });
            progress.handleEnd();

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(false);
              expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/1000/);
            });
          });

          it('should set the state to error for response code = 205', function () {
            progress.handleResponse({ statusCode: 205, headers: { 'content-length': 1000 } });
            progress.handleEnd();

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(false);
              expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/1000/);
            });
          });

          it('should set the state to error for response code = 206', function () {
            progress.handleResponse({ statusCode: 206, headers: { 'content-length': 1000 } });
            progress.handleEnd();

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(false);
              expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/1000/);
            });
          });

          it('should set the state to error for response code = 300', function () {
            progress.handleResponse({ statusCode: 300, headers: { 'content-length': 1000 } });
            progress.handleEnd();

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(false);
              expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/1000/);
            });
          });

          it('should set the state to error for response code = 301', function () {
            progress.handleResponse({ statusCode: 301, headers: { 'content-length': 1000 } });
            progress.handleEnd();

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(false);
              expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/1000/);
            });
          });

          it('should set the state to error for response code = 302', function () {
            progress.handleResponse({ statusCode: 302, headers: { 'content-length': 1000 } });
            progress.handleEnd();

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(false);
              expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/1000/);
            });
          });

          it('should set the state to error for response code = 303', function () {
            progress.handleResponse({ statusCode: 303, headers: { 'content-length': 1000 } });
            progress.handleEnd();

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(false);
              expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/1000/);
            });
          });

          it('should set the state to error for response code = 304', function () {
            progress.handleResponse({ statusCode: 304, headers: { 'content-length': 1000 } });
            progress.handleEnd();

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(false);
              expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/1000/);
            });
          });

          it('should set the state to error for response code = 305', function () {
            progress.handleResponse({ statusCode: 305, headers: { 'content-length': 1000 } });
            progress.handleEnd();

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(false);
              expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/1000/);
            });
          });

          it('should set the state to error for response code = 306', function () {
            progress.handleResponse({ statusCode: 306, headers: { 'content-length': 1000 } });
            progress.handleEnd();

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(false);
              expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/1000/);
            });
          });

          it('should set the state to error for response code = 307', function () {
            progress.handleResponse({ statusCode: 307, headers: { 'content-length': 1000 } });
            progress.handleEnd();

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(false);
              expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/1000/);
            });
          });

          it('should log "unknown number of" for response codes < 400 without content-length header', function () {
            progress.handleResponse({ statusCode: 200, headers: {} });
            progress.handleEnd();

            var errorStub = sinon.stub();
            return progress.deferred
            .catch(errorStub)
            .then(function (data) {
              expect(errorStub.called).to.be(false);
              expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/unknown number/);
            });
          });

        });

      });

      describe('handleData', function () {

        it('should do nothing if the reporter is in an error state', function () {
          progress.handleResponse({ statusCode: 400 });
          progress.handleData({ length: 100 });

          var errorStub = sinon.stub();
          return progress.deferred
          .catch(errorStub)
          .then(function (data) {
            expect(progress.hasError()).to.be(true);
            expect(request.abort.called).to.be(true);
            expect(logger.log.callCount).to.be(0);
          });
        });

        it('should do nothing if handleResponse hasn\'t successfully executed yet', function () {
          progress.handleData({ length: 100 });
          progress.handleEnd();

          var errorStub = sinon.stub();
          return progress.deferred
          .catch(errorStub)
          .then(function (data) {
            expect(logger.log.callCount).to.be(1);
            expect(logger.log.lastCall.args[0]).to.match(/complete/i);
          });
        });

        it('should do nothing if handleResponse was called without a content-length header', function () {
          progress.handleResponse({ statusCode: 200, headers: {} });
          progress.handleData({ length: 100 });
          progress.handleEnd();

          var errorStub = sinon.stub();
          return progress.deferred
          .catch(errorStub)
          .then(function (data) {
            expect(logger.log.callCount).to.be(2);
            expect(logger.log.getCall(0).args[0]).to.match(/downloading/i);
            expect(logger.log.getCall(1).args[0]).to.match(/complete/i);
          });
        });

        it('should show a max of 20 dots for full prgress', function () {
          progress.handleResponse({ statusCode: 200, headers: { 'content-length': 1000 } });
          progress.handleData({ length: 1000 });
          progress.handleEnd();

          var errorStub = sinon.stub();
          return progress.deferred
          .catch(errorStub)
          .then(function (data) {
            expect(logger.log.callCount).to.be(22);
            expect(logger.log.getCall(0).args[0]).to.match(/downloading/i);
            expect(logger.log.getCall(1).args[0]).to.be('.');
            expect(logger.log.getCall(2).args[0]).to.be('.');
            expect(logger.log.getCall(3).args[0]).to.be('.');
            expect(logger.log.getCall(4).args[0]).to.be('.');
            expect(logger.log.getCall(5).args[0]).to.be('.');
            expect(logger.log.getCall(6).args[0]).to.be('.');
            expect(logger.log.getCall(7).args[0]).to.be('.');
            expect(logger.log.getCall(8).args[0]).to.be('.');
            expect(logger.log.getCall(9).args[0]).to.be('.');
            expect(logger.log.getCall(10).args[0]).to.be('.');
            expect(logger.log.getCall(11).args[0]).to.be('.');
            expect(logger.log.getCall(12).args[0]).to.be('.');
            expect(logger.log.getCall(13).args[0]).to.be('.');
            expect(logger.log.getCall(14).args[0]).to.be('.');
            expect(logger.log.getCall(15).args[0]).to.be('.');
            expect(logger.log.getCall(16).args[0]).to.be('.');
            expect(logger.log.getCall(17).args[0]).to.be('.');
            expect(logger.log.getCall(18).args[0]).to.be('.');
            expect(logger.log.getCall(19).args[0]).to.be('.');
            expect(logger.log.getCall(20).args[0]).to.be('.');
            expect(logger.log.getCall(21).args[0]).to.match(/complete/i);
          });

        });

        it('should show dot for each 5% of completion', function () {
          progress.handleResponse({ statusCode: 200, headers: { 'content-length': 1000 } });
          expect(logger.log.callCount).to.be(1);

          progress.handleData({ length: 50 });  //5%
          expect(logger.log.callCount).to.be(2);

          progress.handleData({ length: 100 }); //15%
          expect(logger.log.callCount).to.be(4);

          progress.handleData({ length: 200 }); //25%
          expect(logger.log.callCount).to.be(8);

          progress.handleData({ length: 590 }); //94%
          expect(logger.log.callCount).to.be(20);

          progress.handleData({ length: 60 });  //100%
          expect(logger.log.callCount).to.be(21);

          //Any progress over 100% should be ignored.
          progress.handleData({ length: 9999 });
          expect(logger.log.callCount).to.be(21);

          progress.handleEnd();
          expect(logger.log.callCount).to.be(22);

          var errorStub = sinon.stub();
          return progress.deferred
          .catch(errorStub)
          .then(function (data) {
            expect(errorStub.called).to.be(false);
            expect(logger.log.getCall(0).args[0]).to.match(/downloading/i);
            expect(logger.log.getCall(21).args[0]).to.match(/complete/i);
          });
        });

      });

      describe('handleEnd', function () {

        it('should reject the deferred with a ENOTFOUND error if the reporter is in an error state', function () {
          progress.handleResponse({ statusCode: 400 });

          progress.handleEnd();

          var errorStub = sinon.stub();
          return progress.deferred
          .catch(errorStub)
          .then(function (data) {
            expect(errorStub.firstCall.args[0].message).to.match(/ENOTFOUND/);
            expect(errorStub.called).to.be(true);
          });
        });

        it('should resolve if the reporter is not in an error state', function () {
          progress.handleResponse({ statusCode: 307, headers: { 'content-length': 1000 } });

          progress.handleEnd();

          var errorStub = sinon.stub();
          return progress.deferred
          .catch(errorStub)
          .then(function (data) {
            expect(errorStub.called).to.be(false);
            expect(logger.log.lastCall.args[0]).to.match(/complete/i);
          });
        });

      });

      describe('handleError', function () {

        it('should log any errors', function () {
          progress.handleError('ERRORMESSAGE', new Error('oops!'));

          var errorStub = sinon.stub();
          return progress.deferred
          .catch(errorStub)
          .then(function (data) {
            expect(errorStub.called).to.be(true);
            expect(logger.error.callCount).to.be(1);
            expect(logger.error.lastCall.args[0]).to.match(/oops!/);
          });
        });

        it('should set the error state of the reporter', function () {
          progress.handleError('ERRORMESSAGE', new Error('oops!'));

          var errorStub = sinon.stub();
          return progress.deferred
          .catch(errorStub)
          .then(function (data) {
            expect(progress.hasError()).to.be(true);
          });
        });

        it('should ignore all errors except the first.', function () {
          progress.handleError('ERRORMESSAGE', new Error('oops!'));
          progress.handleError('ERRORMESSAGE', new Error('second error!'));
          progress.handleError('ERRORMESSAGE', new Error('third error!'));
          progress.handleError('ERRORMESSAGE', new Error('fourth error!'));

          var errorStub = sinon.stub();
          return progress.deferred
          .catch(errorStub)
          .then(function (data) {
            expect(errorStub.called).to.be(true);
            expect(logger.error.callCount).to.be(1);
            expect(logger.error.lastCall.args[0]).to.match(/oops!/);
          });
        });

      });

    });

  });

});