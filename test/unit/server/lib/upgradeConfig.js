var root = require('requirefrom')('');
var upgradeConfig = root('src/server/lib/upgradeConfig');
var expect = require('expect.js');
var sinon = require('sinon');
var sinonAsPromised = require('sinon-as-promised')(require('bluebird'));
var util = require('util');
var package = root('package.json');
var config = root('src/server/config');

var upgradeFrom4_0_0_to_4_0_1 = root('test/unit/fixtures/config_upgrade_from_4.0.0_to_4.0.1.json');
var upgradeFrom4_0_0_to_4_0_1_snapshot = root('test/unit/fixtures/config_upgrade_from_4.0.0_to_4.0.1-snapshot.json');
var upgradeFrom4_0_0 = root('test/unit/fixtures/config_upgrade_from_4.0.0.json');
upgradeFrom4_0_0_to_4_0_1.hits.hits[0]._index = config.kibana.kibana_index;
upgradeFrom4_0_0_to_4_0_1.hits.hits[1]._index = config.kibana.kibana_index;
upgradeFrom4_0_0_to_4_0_1_snapshot.hits.hits[0]._index = config.kibana.kibana_index;
upgradeFrom4_0_0_to_4_0_1_snapshot.hits.hits[1]._index = config.kibana.kibana_index;
upgradeFrom4_0_0.hits.hits[0]._index = config.kibana.kibana_index;

describe('lib/upgradeConfig', function () {

  var client, oldPackageVersion, oldBuildNum;
  beforeEach(function () {
    oldPackageVersion = config.package.version;
    oldBuildNum = config.buildNum;
    client = { create: sinon.stub() };
  });

  afterEach(function () {
    config.package.version = oldPackageVersion;
    config.buildNum = oldBuildNum;
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

  it('should not upgrade even if a snapshot exists', function () {
    config.package.version = '4.0.1-snapshot';
    client.create.rejects(new Error('DocumentAlreadyExistsException'));
    var fn = upgradeConfig(client);
    return fn(upgradeFrom4_0_0_to_4_0_1_snapshot).finally(function () {
      sinon.assert.notCalled(client.create);
    });
  });

  it('should upgrade from 4.0.0 to 4.0.1', function () {
    config.package.version = '4.0.1';
    config.buildNum = 5921;
    var fn = upgradeConfig(client);
    client.create.resolves({ _index: config.kibana.kibana_index, _type: 'config', _id: '4.0.1', _version: 1, created: true });
    return fn(upgradeFrom4_0_0).finally(function () {
      sinon.assert.calledOnce(client.create);
      var body = client.create.args[0][0];
      expect(body).to.eql({
        index: config.kibana.kibana_index,
        type: 'config',
        id: '4.0.1',
        body: {
          'buildNum': 5921,
          'defaultIndex': 'logstash-*'
        }
      });
    });

  });

});
