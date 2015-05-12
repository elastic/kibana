var root = require('requirefrom')('');
var _ = require('lodash');
var upgradeConfig = root('src/server/plugins/elasticsearch/lib/upgrade_config');
var Promise = require('bluebird');
var sinon = require('sinon');
var expect = require('expect.js');

describe('pluigns/elasticsearch', function () {
  describe('lib/upgrade_config', function () {

    var get, server, client, config, upgrade;
    beforeEach(function () {
      get = sinon.stub();
      get.withArgs('kibana.package.version').returns('4.0.1');
      get.withArgs('kibana.index').returns('.my-kibana');
      client = { create: sinon.stub() };
      server = {
        log: sinon.stub(),
        config: function () { return { get: get }; },
        plugins: { elasticsearch: { client: client } }
      };
      upgrade = upgradeConfig(server);
    });

    it('should resolve with undefined if nothing is found', function () {
      return upgrade({ hits: { hits:[] } }).then(function (resp) {
        expect(resp).to.be(undefined);
      });
    });

    it('should resolve with undefined if the current version is found', function () {
      var response = { hits: { hits: [ { _id: '4.0.1' } ] } };
      return upgrade(response).then(function (resp) {
        expect(resp).to.be(undefined);
      });
    });

    it('should resolve with undefined if the nothing is upgradeable', function () {
      var response = { hits: { hits: [ { _id: '4.0.1-beta1' }, { _id: '4.0.0-snapshot1' } ] } };
      return upgrade(response).then(function (resp) {
        expect(resp).to.be(undefined);
      });
    });

    it('should update the build number on the new config', function () {
      get.withArgs('kibana.buildNum').returns(5801);
      client.create.returns(Promise.resolve());
      var response = { hits: { hits: [ { _id: '4.0.0', _source: { buildNum: 1 } } ] } };
      return upgrade(response).then(function (resp) {
        sinon.assert.calledOnce(client.create);
        var params = client.create.args[0][0];
        expect(params).to.have.property('body');
        expect(params.body).to.have.property('buildNum', 5801);
        expect(params).to.have.property('index', '.my-kibana');
        expect(params).to.have.property('type', 'config');
        expect(params).to.have.property('id', '4.0.1');
      });
    });

    it('should update the build number to max integer if buildNum is template string', function () {
      get.withArgs('kibana.buildNum').returns('@@buildNum');
      client.create.returns(Promise.resolve());
      var response = { hits: { hits: [ { _id: '4.0.0', _source: { buildNum: 1 } } ] } };
      return upgrade(response).then(function (resp) {
        sinon.assert.calledOnce(client.create);
        var params = client.create.args[0][0];
        expect(params).to.have.property('body');
        expect(params.body).to.have.property('buildNum', Math.pow(2, 53) - 1);
      });
    });

    it('should log a message for upgrades', function () {
      get.withArgs('kibana.buildNum').returns(5801);
      client.create.returns(Promise.resolve());
      var response = { hits: { hits: [ { _id: '4.0.0', _source: { buildNum: 1 } } ] } };
      return upgrade(response).then(function (resp) {
        sinon.assert.calledOnce(server.log);
        expect(server.log.args[0][0]).to.be('plugin');
        expect(server.log.args[0][1]).to.be('[ elasticsearch ] Upgrade config from 4.0.0 to 4.0.1');
      });
    });

    it('should copy attributes from old config', function () {
      get.withArgs('kibana.buildNum').returns(5801);
      client.create.returns(Promise.resolve());
      var response = { hits: { hits: [ { _id: '4.0.0', _source: { buildNum: 1, defaultIndex: 'logstash-*' } } ] } };
      return upgrade(response).then(function (resp) {
        sinon.assert.calledOnce(client.create);
        var params = client.create.args[0][0];
        expect(params).to.have.property('body');
        expect(params.body).to.have.property('defaultIndex', 'logstash-*');
      });
    });

  });
});
