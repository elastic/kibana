define(function (require) {
  var elasticsearch = require('bower_components/elasticsearch/elasticsearch');
  var _ = require('lodash');
  var sinon = require('testUtils/auto_release_sinon');
  var Courier = require('courier/courier');
  var DataSource = require('courier/data_source/data_source');
  var Mapper = require('courier/mapper');
  var fieldMapping = require('../fixtures/field_mapping');

  var client = new elasticsearch.Client({
    host: 'localhost:9200',
  });

  var courier = new Courier({
    client: client
  });

  describe('Mapper', function () {
    var server, source, mapper;

    beforeEach(function () {
      source = courier.createSource('search')
        .index('valid')
        .size(5);
      mapper = new Mapper(courier);

      // Stub out a mini mapping response.
      sinon.stub(client.indices, 'getFieldMapping', function (params, callback) {
        if (params.index === 'valid') {
          setTimeout(callback(undefined, fieldMapping), 0);
        } else {
          setTimeout(callback('Error: Not Found', undefined));
        }
      });

      sinon.stub(client, 'getSource', function (params, callback) {
        if (params.id === 'valid') {
          setTimeout(callback(undefined, {'foo.bar': {'type': 'string'}}), 0);
        } else {
          setTimeout(callback('Error: Not Found', undefined), 0);
        }
      });

      sinon.stub(client, 'delete', function (params, callback) {
        callback(undefined, true);
      });
    });

    it('provides a constructor for the Mapper class', function (done) {
      var mapper = new Mapper(courier);
      expect(mapper).to.be.a(Mapper);
      done();
    });

    it('has getFieldsFromMapping function that returns a mapping', function (done) {
      mapper.getFieldsFromMapping(source, function (err, mapping) {
        expect(client.indices.getFieldMapping.called).to.be(true);
        expect(mapping['foo.bar'].type).to.be('string');
        done();
      });
    });

    it('has getFieldsFromCache that returns an error for uncached indices', function (done) {
      source = courier.createSource('search')
        .index('invalid')
        .size(5);

      mapper.getFieldsFromCache(source, function (err, mapping) {
        expect(client.getSource.called).to.be(true);
        expect(err).to.be('Error: Not Found');
        done();
      });
    });

    it('has getFieldsFromCache that returns a mapping', function (done) {
      mapper.getFieldsFromCache(source, function (err, mapping) {
        expect(client.getSource.called).to.be(true);
        expect(mapping['foo.bar'].type).to.be('string');
        done();
      });
    });

    it('has a getFieldsFromObject function', function (done) {
      expect(mapper.getFieldsFromObject).to.be.a('function');
      done();
    });

    it('has a getFields that returns a mapping from cache', function (done) {
      mapper.getFields(source, function (err, mapping) {
        expect(client.getSource.called).to.be(true);
        expect(client.indices.getFieldMapping.called).to.be(false);
        expect(mapping['foo.bar'].type).to.be('string');
        done();
      });
    });


    it('can get fields from a cached object if they have been retrieved before', function (done) {
      sinon.spy(mapper, 'getFieldsFromObject');
      mapper.getFields(source, function (err, mapping) {

        mapper.getFields(source, function (err, mapping) {
          expect(mapping['foo.bar'].type).to.be('string');
          expect(mapper.getFieldsFromObject.calledOnce);
          done();
        });
      });

      mapper.getFieldsFromObject.restore();
    });

    it('gets fields from the mapping if not already cached', function (done) {
      sinon.stub(mapper, 'getFieldsFromCache', function (source, callback) {
        callback({error: 'Stubbed cache get failure'});
      });

      sinon.spy(mapper, 'getFieldsFromMapping');

      mapper.getFields(source, function (err, mapping) {
        expect(mapping['foo.bar'].type).to.be('string');
        expect(mapper.getFieldsFromMapping.calledOnce);

        done();
      });

      mapper.getFieldsFromCache.restore();
      mapper.getFieldsFromMapping.restore();
    });

    it('throws an error if it is unable to cache to Elasticsearch', function (done) {
      sinon.stub(mapper, 'getFieldsFromCache', function (source, callback) {
        callback({error: 'Stubbed failure'});
      });

      sinon.stub(client, 'index', function (params, callback) {
        callback({error: 'Stubbed cache write failure'});
      });

      // TODO: Correctly test thrown errors.
      sinon.stub(courier, '_error', function () { return; });

      mapper.getFields(source, function (err, mapping) {
        expect(courier._error.calledOnce);
      });

      done();

      mapper.getFieldsFromCache.restore();
      client.index.restore();
      courier._error.restore();
    });

    it('has getFields that throws an error for invalid indices', function (done) {
      source = courier.createSource('search')
        .index('invalid')
        .size(5);
      try {
        mapper.getFields(source, function (err, mapping) {
          // Should not be called
          expect('the callback').to.be('not executed');
          done();
        });
      } catch (e) {
        expect(true).to.be(true);
        done();
      }
    });

    it('has a clearCache that calls client.delete', function (done) {
      mapper.clearCache(source, function () {
        expect(client.delete.called).to.be(true);
        done();
      });
    });

  });

});