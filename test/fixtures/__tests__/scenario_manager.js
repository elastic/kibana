const expect = require('expect.js');
const sinon = require('sinon');
const Promise = require('bluebird');

const ScenarioManager = require('../scenario_manager');

describe('scenario manager', function () {
  const manager = new ScenarioManager('http://localhost:9200');

  describe('loading and unloading', function () {
    this.timeout(60000);

    let bulk;
    let create;
    let indicesDelete;
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
      const load = sinon.stub(manager, 'load', Promise.resolve);
      const unload = sinon.stub(manager, 'unload', Promise.resolve);
      const id = 'makelogs';
      return manager.reload(id).then(function () {
        expect(load.calledWith(id)).to.be(true);
        expect(unload.calledWith(id)).to.be(true);

        load.restore();
        unload.restore();
      });
    });

    it('should load if the index does not exist', function () {
      const load = sinon.stub(manager, 'load', Promise.resolve);
      const throwError = sinon.stub(manager.client, 'count', Promise.reject);
      const id = 'makelogs';
      return manager.loadIfEmpty(id).then(function () {
        expect(load.calledWith(id)).to.be(true);

        load.restore();
        throwError.restore();
      });
    });

    it('should load if the index is empty', function () {
      const load = sinon.stub(manager, 'load', Promise.resolve);
      const returnZero = sinon.stub(manager.client, 'count', function () {
        return Promise.resolve({
          'count': 0
        });
      });
      const id = 'makelogs';
      return manager.loadIfEmpty(id).then(function () {
        expect(load.calledWith(id)).to.be(true);

        load.restore();
        returnZero.restore();
      });
    });


    it('should not load if the index is not empty', function () {
      const load = sinon.stub(manager, 'load', Promise.resolve);
      const returnOne = sinon.stub(manager.client, 'count', function () {
        return Promise.resolve({
          'count': 1
        });
      });
      const id = 'makelogs';
      return manager.loadIfEmpty(id).then(function () {
        expect(load.called).to.be(false);

        load.restore();
        returnOne.restore();
      });
    });


    afterEach(function () {
      bulk.restore();
      create.restore();
      indicesDelete.restore();
    });
  });

  describe('load', function () {
    it('should reject if the scenario is not specified', function () {
      return manager.load()
      .then(function () {
        throw new Error('Promise should reject');
      })
      .catch(function () { return; });
    });

    it('should reject if the scenario is not defined', function () {
      return manager.load('idonotexist')
      .then(function () {
        throw new Error('Promise should reject');
      })
      .catch(function () { return; });
    });
  });

  describe('unload', function () {
    it('should reject if the scenario is not specified', function () {
      return manager.unload()
      .then(function () {
        throw new Error('Promise should reject');
      })
      .catch(function () { return; });
    });

    it('should reject if the scenario is not defined', function () {
      return manager.unload('idonotexist')
      .then(function () {
        throw new Error('Promise should reject');
      })
      .catch(function () { return; });
    });
  });

  it('should throw an error if an es server is not specified', function () {
    function instantiate() {
      new ScenarioManager();
    }

    expect(instantiate).to.throwError();
  });
});
