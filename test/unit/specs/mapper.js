define(function (require) {
  var elasticsearch = require('bower_components/elasticsearch/elasticsearch');
  var _ = require('lodash');
  var sinon = require('testUtils/auto_release_sinon');
  var Courier = require('courier/courier');
  var DataSource = require('courier/data_source/data_source');
  var Mapper = require('courier/mapper');
  var fieldMapping = require('../fixtures/field_mapping');
  var fieldMappingWithDupes = require('../fixtures/mapping_with_dupes');

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
        } else if (params.index === 'dupes') {
          setTimeout(callback(undefined, fieldMappingWithDupes), 0);
        } else {
          setTimeout(callback('Error: Not Found', undefined));
        }
      });

      sinon.stub(client, 'getSource', function (params, callback) {
        if (params.id === 'valid') {
          setTimeout(callback(undefined, {'baz': {'type': 'long'}, 'foo.bar': {'type': 'string'}}), 0);
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

    it('has a clearCache that clears the object cache', function (done) {
      mapper.getFields(source, function (err, mapping) {
        expect(mapper.getFieldsFromObject(source)).to.be.a(Object);
        mapper.clearCache(source, function () {
          expect(mapper.getFieldsFromObject(source)).to.be(false);
          done();
        });
      });

    });

    it('has a getFieldMapping that returns the mapping for a field', function (done) {
      mapper.getFieldMapping(source, 'foo.bar', function (err, field) {
        expect(field).to.be.a(Object);
        done();
      });
    });

    it('has a getFieldMapping that returns the mapping for a field', function (done) {
      mapper.getFieldMapping(source, 'foo.bar', function (err, field) {
        expect(field.type).to.be('string');
        done();
      });
    });

    it('has a getFieldsMapping that returns the mapping for multiple fields', function (done) {
      mapper.getFieldsMapping(source, ['foo.bar', 'baz'], function (err, mapping) {
        expect(mapping['foo.bar'].type).to.be('string');
        expect(mapping.baz.type).to.be('long');
        done();
      });
    });

    it('has a getFieldsFromMapping that throws an error if a field is defined differently in 2 indices', function (done) {
      source = courier.createSource('search').index('dupes');

      // TODO: Correctly test thrown errors.
      sinon.stub(courier, '_error', function () { return; });

      mapper.getFieldsFromMapping(source, function (err, mapping) {
        expect(courier._error.calledOnce);
        done();
      });
    });

    it('has an ignoreFields that sets the type of a field to "ignore"', function (done) {
      mapper.getFields(source, function (err, mapping) {
        mapper.getFieldMapping(source, 'foo.bar', function (err, field) {
          expect(field.type).to.be('string');
          mapper.ignoreFields(source, 'foo.bar', function(err, mapping) {
            expect(mapping['foo.bar'].type).to.be('ignore');
            done();
          });
        });
      });
    });

  });

});