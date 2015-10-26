var expect = require('expect.js');
var sinon = require('sinon');
var Promise = require('bluebird');

var ScenarioManager = require('../scenarioManager');

describe('scenario manager', function () {
  var manager = new ScenarioManager('http://localhost:9200');

  describe('loading and unloading', function () {
    this.timeout(60000);

    var bulk;
    var create;
    var indicesDelete;
    beforeEach(function () {
      bulk = sinon.stub(manager.client, 'bulk', Promise.resolve);
      create = sinon.stub(manager.client.indices, 'create', Promise.resolve);
      indicesDelete = sinon.stub(manager.client.indices, 'delete', Promise.resolve);
    });

    it('should be able to load scenarios', function () {
      return manager.load('makelogs')
      .then(function () {
        expect(create.getCall(0).args[0].index).to.be('logstash-2015.09.17');
        expect(create.getCall(1).args[0].index).to.be('logstash-2015.09.18');
        expect(bulk.called).to.be(true);
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

    it('should be able to reload a scenario', function () {
      var load = sinon.stub(manager, 'load', Promise.resolve);
      var unload = sinon.stub(manager, 'unload', Promise.resolve);
      var id = 'makelogs';
      return manager.reload(id).then(function () {
        expect(load.calledWith(id)).to.be(true);
        expect(unload.calledWith(id)).to.be(true);

        load.restore();
        unload.restore();
      });
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
