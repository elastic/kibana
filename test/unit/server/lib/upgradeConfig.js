var root = require('requirefrom')('');
var upgradeConfig = root('src/server/lib/upgradeConfig');
var expect = require('expect.js');
var sinon = require('sinon');
var sinonAsPromised = require('sinon-as-promised')(require('bluebird'));
var util = require('util');
var package = root('package.json');
var Promise = require('bluebird');
var config = root('src/server/config');

var upgradeFrom4_0_0_to_4_0_1 = root('test/unit/fixtures/config_upgrade_from_4.0.0_to_4.0.1.json');
var upgradeFrom4_0_0_to_4_0_1_snapshot = root('test/unit/fixtures/config_upgrade_from_4.0.0_to_4.0.1-snapshot.json');

describe('lib/upgradeConfig', function () {

  var client, oldPackageVersion;
  beforeEach(function () {
    oldPackageVersion = config.package.version;
    client = { create: sinon.stub() };
  });

  afterEach(function () {
    config.package.version = oldPackageVersion;
  });

  it('should not upgrade if the current version of the config exits', function () {
    config.package.version = '4.0.1';
    var fn = upgradeConfig(client);
    client.create.rejects(new Error('DocumentAlreadyExistsException'));
    return fn(upgradeFrom4_0_0_to_4_0_1).finally(function () {
      sinon.assert.notCalled(client.create);
    });
  });

  it('should not upgrade if there are no hits', function () {
    config.package.version = '4.0.1';
    var fn = upgradeConfig(client);
    return fn({ hits: { hits: [] } }).finally(function () {
      sinon.assert.notCalled(client.create);
    });
  });

  it('should not upgrade if there are no hits', function () {
    config.package.version = '4.0.1-snapshot';
    client.create.rejects(new Error('DocumentAlreadyExistsException'));
    var fn = upgradeConfig(client);
    return fn(upgradeFrom4_0_0_to_4_0_1_snapshot).finally(function () {
      sinon.assert.notCalled(client.create);
    });
  });

});
