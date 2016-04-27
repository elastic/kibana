define(function (require) {
  var Promise = require('bluebird');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');
  var fakeNamesIndexTemplate = require('intern/dojo/node!../../data/fake_names_index_template.json');

  return function (bdd, scenarioManager, request) {
    const es = scenarioManager.client;
    bdd.describe('_bulk', function () {

      bdd.beforeEach(function () {
        return es.indices.putTemplate({
          name: 'names',
          body: fakeNamesIndexTemplate
        });
      });

      bdd.afterEach(function () {
        return es.indices.delete({
          index: 'names',
          ignore: 404
        })
        .then(() => {
          return es.indices.deleteTemplate({name: 'names'});
        });
      });

      bdd.it('should require a multipart/form-data request with a csv file attached', function () {
        return request.post('/kibana/names/_bulk')
        .attach('csv', 'test/unit/data/fake_names.csv')
        .expect(200);
      });

      bdd.it('should return 400 if no csv is provided', function () {
        return request.post('/kibana/names/_bulk')
        .expect(400);
      });

      bdd.it('should return JSON results', function () {
        return request.post('/kibana/names/_bulk')
        .attach('csv', 'test/unit/data/fake_names.csv')
        .expect('Content-Type', /json/)
        .expect(200);
      });

      bdd.it('should index one document per row in the csv', function () {
        return request.post('/kibana/names/_bulk')
        .attach('csv', 'test/unit/data/fake_names.csv')
        .expect(200)
        .then((bulkResponse) => {
          return es.indices.refresh()
          .then(() => {
            return es.count({ index: 'names' })
            .then((res) => {
              expect(res.count).to.be(100);
            });
          });
        });
      });

      bdd.it('should stream a chunked response', function () {
        return request.post('/kibana/names/_bulk')
        .attach('csv', 'test/unit/data/fake_names.csv')
        .expect('Transfer-Encoding', 'chunked')
        .expect(200);
      });

      bdd.it('should respond with an array of one or more "result objects"', function () {
        return request.post('/kibana/names/_bulk')
          .attach('csv', 'test/unit/data/fake_names_big.csv')
          .expect(200)
          .then((bulkResponse) => {
            expect(bulkResponse.body.length).to.be(14);
          });
      });

      bdd.describe('result objects', function () {

        bdd.it('should include a count of created documents', function () {
          return request.post('/kibana/names/_bulk')
          .attach('csv', 'test/unit/data/fake_names.csv')
          .expect(200)
          .then((bulkResponse) => {
            expect(bulkResponse.body[0]).to.have.property('created');
            expect(bulkResponse.body[0].created).to.be(100);
          });
        });

        bdd.it('should report any indexing errors per document under an "errors.index" key', function () {
          return request.post('/kibana/names/_bulk')
            .attach('csv', 'test/unit/data/fake_names_with_mapping_errors.csv')
            .expect(200)
            .then((bulkResponse) => {
              expect(bulkResponse.body[0]).to.have.property('created');
              expect(bulkResponse.body[0].created).to.be(98);
              expect(bulkResponse.body[0]).to.have.property('errors');
              expect(bulkResponse.body[0].errors).to.have.property('index');
              expect(bulkResponse.body[0].errors.index.length).to.be(2);
            });
        });

        bdd.it('should report any csv parsing errors under an "errors.other" key', function () {
          return request.post('/kibana/names/_bulk')
            .attach('csv', 'test/unit/data/fake_names_with_parse_errors.csv')
            .expect(200)
            .then((bulkResponse) => {
              // parse errors immediately abort indexing
              expect(bulkResponse.body[0]).to.have.property('created');
              expect(bulkResponse.body[0].created).to.be(0);

              expect(bulkResponse.body[0]).to.have.property('errors');
              expect(bulkResponse.body[0].errors).to.have.property('other');
              expect(bulkResponse.body[0].errors.other.length).to.be(1);
            });
        });

      });

      bdd.describe('optional parameters', function () {
        bdd.it('should accept a custom delimiter for parsing the CSV', function () {
          return request.post('/kibana/names/_bulk')
          .field('delimiter', '|')
          .attach('csv', 'test/unit/data/fake_names_pipe_delimited.csv')
          .expect(200)
          .then((bulkResponse) => {
            expect(bulkResponse.body[0]).to.have.property('created');
            expect(bulkResponse.body[0].created).to.be(2);
            expect(bulkResponse.body[0]).to.not.have.property('errors');
          });
        });

        bdd.it('should accept a boolean pipeline parameter enabling use of the index pattern\'s associated pipeline', function () {
          return es.transport.request({
            path: '_ingest/pipeline/kibana-names',
            method: 'put',
            body: {
              processors: [
                {
                  set: {
                    field: 'foo',
                    value: 'bar'
                  }
                }
              ]
            }
          })
          .then((res) => {
            return request.post('/kibana/names/_bulk')
            .field('pipeline', 'true')
            .attach('csv', 'test/unit/data/fake_names.csv')
            .expect(200);
          })
          .then(() => {
            return es.indices.refresh();
          })
          .then(() => {
            return es.search({
              index: 'names'
            });
          })
          .then((searchResponse) => {
            _.forEach(searchResponse.hits.hits, (doc) => {
              expect(doc._source).to.have.property('foo');
              expect(doc._source.foo).to.be('bar');
            });
            return searchResponse;
          })
          .finally(() => {
            return es.transport.request({
              path: '_ingest/pipeline/kibana-names',
              method: 'delete'
            });
          });
        });
      });

    });
  };
});
