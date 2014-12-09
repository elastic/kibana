define(function (require) {
  return ['Index Pattern', function () {
    var _ = require('lodash');
    var sinon = require('test_utils/auto_release_sinon');
    var Promise = require('bluebird');
    var IndexPattern;
    var mappingSetup;
    var mockLogstashFields;
    var DocSource;
    var config;
    var docSourceResponse;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private, $injector, _config_) {
      config = _config_;
      mockLogstashFields = Private(require('fixtures/logstash_fields'));
      docSourceResponse = Private(require('fixtures/stubbed_doc_source_response'));

      DocSource = Private(require('components/courier/data_source/doc_source'));
      sinon.stub(DocSource.prototype, 'doUpdate');
      sinon.stub(DocSource.prototype, 'doIndex');
      sinon.stub(DocSource.prototype, 'fetch');

      // stub mappingSetup
      mappingSetup = Private(require('utils/mapping_setup'));
      sinon.stub(mappingSetup, 'isDefined', function () {
        return Promise.resolve(true);
      });

      IndexPattern = Private(require('components/index_patterns/_index_pattern'));
    }));

    // helper function to create index patterns
    function create(id, payload) {
      var indexPattern = new IndexPattern(id);
      payload = _.defaults(payload || {}, docSourceResponse(id));
      DocSource.prototype.fetch.returns(Promise.resolve(payload));
      return indexPattern.init();
    }

    describe('init', function () {
      it('should append the found fields', function () {
        return create('test-pattern').then(function (indexPattern) {
          expect(DocSource.prototype.fetch.callCount).to.be(1);
          expect(indexPattern.fields).to.have.length(mockLogstashFields.length);
        });
      });
    });
  }];
});
