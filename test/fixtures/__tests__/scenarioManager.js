var expect = require('expect.js');
var sinon = require('sinon');
var Promise = require('bluebird');

var ScenarioManager = require('../scenarioManager');

describe('scenario manager', function () {
  var manager = new ScenarioManager('http://localhost:9200');

  describe('loading and unloading', function () {
    var bulk;
    var create;
    var indicesDelete;
    beforeEach(function () {
      function response() {
        return new Promise(function (resolve) {
          resolve();
        });
      }
      bulk = sinon.stub(manager.client, 'bulk', response);
      create = sinon.stub(manager.client.indices, 'create', response);
      indicesDelete = sinon.stub(manager.client.indices, 'delete', response);
    });

    it('should be able to load scenarios', function (done) {
      manager.load('makelogs')
        .then(function () {
          expect(create.getCall(0).args[0].index).to.be('logstash-2015.09.17');
          expect(create.getCall(1).args[0].index).to.be('logstash-2015.09.18');
          expect(bulk.called).to.be(true);
          done();
        });
    });

    it('should be able to delete all indices', function () {
      manager.deleteAll();
      expect(indicesDelete.calledWith({
        index: '*'
      })).to.be(true);
    });

    it('should be able to delete a scenario', function () {
      manager.unload('makelogs');
      expect(indicesDelete.calledWith({
        index: ['logstash-2015.09.17', 'logstash-2015.09.18']
      })).to.be(true);
    });

    afterEach(function () {
      bulk.restore();
      create.restore();
      indicesDelete.restore();
    });
  });

  it('should throw an error if the scenario is not defined', function () {
    expect(manager.load).withArgs('makelogs').to.throwError();
  });

  it('should throw an error if an index is not defined when clearing', function () {
    expect(manager.unload).to.throwError();
  });

  it('should throw an error if an es server is not specified', function () {
    function instantiate() {
      new ScenarioManager();
    }

    expect(instantiate).to.throwError();
  });
});
