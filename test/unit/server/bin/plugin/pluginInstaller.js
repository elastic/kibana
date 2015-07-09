var root = require('requirefrom')('');
var expect = require('expect.js');
var sinon = require('sinon');
var nock = require('nock');
var glob = require('glob');
var rimraf = require('rimraf');
var fs = require('fs');
var join = require('path').join;
var pluginLogger = root('src/server/bin/plugin/pluginLogger');
var pluginInstaller = root('src/server/bin/plugin/pluginInstaller');
var Promise = require('bluebird');

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('pluginInstaller', function () {

      var logger;
      var testWorkingPath;
      beforeEach(function () {
        logger = pluginLogger(false);
        testWorkingPath = join(__dirname, '.test.data');
        rimraf.sync(testWorkingPath);
        sinon.stub(logger, 'log');
        sinon.stub(logger, 'error');
      });

      afterEach(function () {
        logger.log.restore();
        logger.error.restore();
        rimraf.sync(testWorkingPath);
      });

      //it('should throw an error if the workingPath already exists.', function () {
      //  sinon.stub(process, 'exit');
      //  fs.mkdirSync(testWorkingPath);

      //  var settings = {
      //    pluginPath: testWorkingPath
      //  };

      //  var errorStub = sinon.stub();
      //  return pluginInstaller.install(settings, logger)
      //  .catch(errorStub)
      //  .then(function (data) {
      //    expect(logger.error.firstCall.args[0]).to.match(/already exists/);
      //    expect(process.exit.called).to.be(true);
      //    process.exit.restore();
      //  });
      //});

      //it('should rethrow any non "ENOENT" error from fs.', function () {
      //  sinon.stub(fs, 'statSync', function () {
      //    throw new Error('This is unexpected.');
      //  });

      //  var settings = {
      //    pluginPath: testWorkingPath
      //  };

      //  expect(pluginInstaller.install).withArgs(settings, logger).to.throwException(/this is unexpected/i);
      //});

    });

  });

});