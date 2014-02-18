define(function (require) {
  var elasticsearch = require('../bower_components/elasticsearch/elasticsearch.js');
  var _ = require('lodash');
  var sinon = require('sinon/sinon');
  var Courier = require('courier/courier');
  var DataSource = require('courier/data_source/data_source');
  var Mapper = require('courier/mapper');

  var client = new elasticsearch.Client({
    host: 'localhost:9200',
  });

  var courier = new Courier({
    client: client
  });

  describe('Mapper Module', function () {
    var server, source, mapper;

    beforeEach(function() {
      source = courier.createSource('search')
        .index('logs*')
        .size(5);
      mapper = new Mapper(courier);

    });

    afterEach(function () {
    });

    it('provides a constructor for the Mapper class', function (done) {
      expect(mapper).to.be.a(Mapper);
      done();
    });

    it('has a function called getFieldsFromMapping that calls client.indices.getFieldMapping', function (done) {
      sinon.spy(client.indices, 'getFieldMapping');
      mapper.getFieldsFromMapping(source,function(){});
      expect(client.indices.getFieldMapping.called).to.be(true);
      client.indices.getFieldMapping.restore();
      done();
    });


  });

});