define(function (require) {
  var Promise = require('bluebird');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');
  var fakeNamesIndexTemplate = require('intern/dojo/node!../../fixtures/fake_names_index_template.json');
  var fs = require('intern/dojo/node!fs');

  return function (bdd, scenarioManager, request) {
    const es = scenarioManager.client;
    bdd.describe('_data', function () {

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

      bdd.it('should accept a multipart/form-data request with a csv file attached', function () {
        return request.post('/kibana/names/_data')
        .attach('csv', 'test/unit/fixtures/fake_names.csv')
        .expect(200);
      });

      bdd.it('should also accept the raw csv data in the payload body', function () {
        var csvData = fs.readFileSync('test/unit/fixtures/fake_names_big.csv', {encoding: 'utf8'});

        return request.post('/kibana/names/_data')
        .send(csvData)
        .expect(200);
      });

      bdd.it('should return JSON results', function () {
        return request.post('/kibana/names/_data')
        .attach('csv', 'test/unit/fixtures/fake_names.csv')
        .expect('Content-Type', /json/)
        .expect(200);
      });

      bdd.it('should index one document per row in the csv', function () {
        return request.post('/kibana/names/_data')
        .attach('csv', 'test/unit/fixtures/fake_names.csv')
        .expect(200)
        .then(() => {
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
        return request.post('/kibana/names/_data')
        .attach('csv', 'test/unit/fixtures/fake_names.csv')
        .expect('Transfer-Encoding', 'chunked')
        .expect(200);
      });

      bdd.it('should respond with an array of one or more "result objects"', function () {
        return request.post('/kibana/names/_data')
          .attach('csv', 'test/unit/fixtures/fake_names_big.csv')
          .expect(200)
          .then((dataResponse) => {
            expect(dataResponse.body.length).to.be(14);
          });
      });

      bdd.describe('result objects', function () {

        bdd.it('should include a count of created documents', function () {
          return request.post('/kibana/names/_data')
          .attach('csv', 'test/unit/fixtures/fake_names.csv')
          .expect(200)
          .then((dataResponse) => {
            expect(dataResponse.body[0]).to.have.property('created');
            expect(dataResponse.body[0].created).to.be(100);
          });
        });

        bdd.it('should report any indexing errors per document under an "errors.index" key', function () {
          return request.post('/kibana/names/_data')
            .attach('csv', 'test/unit/fixtures/fake_names_with_mapping_errors.csv')
            .expect(200)
            .then((dataResponse) => {
              expect(dataResponse.body[0]).to.have.property('created');
              expect(dataResponse.body[0].created).to.be(98);
              expect(dataResponse.body[0]).to.have.property('errors');
              expect(dataResponse.body[0].errors).to.have.property('index');
              expect(dataResponse.body[0].errors.index.length).to.be(2);
            });
        });

        bdd.it('should use the filename and line numbers as document IDs', function () {
          return request.post('/kibana/names/_data')
            .attach('csv', 'test/unit/fixtures/fake_names_with_mapping_errors.csv')
            .expect(200)
            .then((dataResponse) => {
              const id = dataResponse.body[0].errors.index[0]._id;
              expect(id).to.be('fake_names_with_mapping_errors.csv:2');
            });
        });

        bdd.it('should report any csv parsing errors under an "errors.other" key', function () {
          return request.post('/kibana/names/_data')
            .attach('csv', 'test/unit/fixtures/fake_names_with_parse_errors.csv')
            .expect(200)
            .then((dataResponse) => {
              // parse errors immediately abort indexing
              expect(dataResponse.body[0]).to.have.property('created');
              expect(dataResponse.body[0].created).to.be(0);

              expect(dataResponse.body[0]).to.have.property('errors');
              expect(dataResponse.body[0].errors).to.have.property('other');
              expect(dataResponse.body[0].errors.other.length).to.be(1);
            });
        });

      });

      bdd.describe('optional parameters', function () {
        bdd.it('should accept a custom csv_delimiter query string param for parsing the CSV', function () {
          return request.post('/kibana/names/_data?csv_delimiter=|')
          .attach('csv', 'test/unit/fixtures/fake_names_pipe_delimited.csv')
          .expect(200)
          .then((dataResponse) => {
            expect(dataResponse.body[0]).to.have.property('created');
            expect(dataResponse.body[0].created).to.be(2);
            expect(dataResponse.body[0]).to.not.have.property('errors');

            return es.indices.refresh();
          })
          .then(() => {
            return es.search({
              index: 'names'
            });
          })
          .then((searchResponse) => {
            const doc = _.get(searchResponse, 'hits.hits[0]._source');
            expect(doc).to.only.have.keys('Number', 'Gender', 'NameSet');
          });
        });

        bdd.it('should accept a boolean pipeline query string parameter enabling use of the index pattern\'s associated pipeline',
        function () {
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
            return request.post('/kibana/names/_data?pipeline=true')
            .attach('csv', 'test/unit/fixtures/fake_names.csv')
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
