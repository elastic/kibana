define(function (require) {
  describe('Setup: Create Kibana Index', function () {
    var sinon = require('test_utils/auto_release_sinon');
    require('test_utils/no_digest_promises').activateForSuite();

    var createKibanaIndex;
    var es;
    var Promise;

    beforeEach(module('kibana'));

    beforeEach(inject(function (Private, $injector) {
      createKibanaIndex = Private(require('components/setup/steps/create_kibana_index'));
      es = $injector.get('es');
      Promise = $injector.get('Promise');
    }));

    it('sets number of shards for kibana index to 1', function () {
      var es_indices_stub = sinon.stub(es.indices, 'create').returns(Promise.resolve({}));
      createKibanaIndex();
      expect(es_indices_stub.calledOnce).to.be(true);
      expect(es_indices_stub.firstCall.args[0].body.settings.number_of_shards).to.be(1);
    });

    it('does not set number of replicas for kibana index', function () {
      var es_indices_stub = sinon.stub(es.indices, 'create').returns(Promise.resolve({}));
      createKibanaIndex();
      expect(es_indices_stub.calledOnce).to.be(true);
      expect(es_indices_stub.firstCall.args[0].body.settings).to.not.have.property('number_of_replicas');
    });

  });
});
