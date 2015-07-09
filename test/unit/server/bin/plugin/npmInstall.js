var root = require('requirefrom')('');
var expect = require('expect.js');
var sinon = require('sinon');
var nock = require('nock');
var glob = require('glob');
var rimraf = require('rimraf');
var fs = require('fs');
var join = require('path').join;
var pluginLogger = root('src/server/bin/plugin/pluginLogger');
var npmInstall = root('src/server/bin/plugin/npmInstall');

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('npmInstall', function () {

      var logger;
      var testWorkingPath;
      beforeEach(function () {
        logger = pluginLogger(false);
        testWorkingPath = join(__dirname, '.test.data');
        rimraf.sync(testWorkingPath);
        sinon.stub(logger, 'log', function (data, sameLine) {
          data.pipe(process.stdout);
        });
        sinon.stub(logger, 'error', function (data) {
          data.pipe(process.stderr);
        });
      });

      afterEach(function () {
        logger.log.restore();
        logger.error.restore();
        rimraf.sync(testWorkingPath);
      });

      it('should throw an error if there is no package.json file in the archive', function () {
        fs.mkdirSync(testWorkingPath);

        var errorStub = sinon.stub();
        return npmInstall(testWorkingPath, logger)
        .catch(errorStub)
        .then(function (data) {
          expect(errorStub.called).to.be(true);
          expect(errorStub.lastCall.args[0].message).to.match(/package.json/);
        });
      });

      //it('should rethrow any errors other than "ENOENT" from fs.statSync', function () {
      //  fs.mkdirSync(testWorkingPath);

      //  sinon.stub(fs, 'statSync', function () {
      //    throw new Error('This is unexpected.');
      //  });

      //  var errorStub = sinon.stub();
      //  return npmInstall(testWorkingPath, logger)
      //  .catch(errorStub)
      //  .then(function (data) {
      //    expect(errorStub.called).to.be(true);
      //    expect(errorStub.lastCall.args[0].message).to.match(/This is unexpected./);

      //    fs.statSync.restore();
      //  });
      //});

    });

  });

});