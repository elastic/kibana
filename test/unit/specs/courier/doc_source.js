/*
define(function (require) {
  var sinon = require('test_utils/auto_release_sinon');
  var _ = require('lodash');
  require('angular-mocks');

  return function extendCourierSuite() {
    var courier, es, $httpBackend;

    beforeEach(inject(function ($injector) {
      courier = $injector.get('courier');
      es = $injector.get('es');
      $httpBackend = $injector.get('$httpBackend');
    }));

    describe('DocSource class', function () {
      it('tracks the version of the document', function (done) {
        var version = 51;

        var source = courier
          .createSource('doc').index('fake').type('fake').id('fake')
          .on('results', function (doc) {
            expect(source._getVersion()).to.eql(version);
            expect(courier._getRefFor(source).version).to.eql(version);
            done();
          });

        courier.start();
      });

      it('updates to a doc will propogate to other docs with the same index/type/id', function (done) {
        var client = (function () {
          // fake server state
          var version = 0;
          var doc = { hi: 'fallacy' };

          return stubClient(es, {
            update: function (params, cb) {
              _.assign(doc, params.body.doc);
              version++;
              cb(void 0, { ok: true });
            },
            default: function (method, params, cb) {
              cb(void 0, stubClient.doc({ _source: doc, _version: version }));
            }
          });
        }());

        var update = { hi: 'truth' };

        // updating this
        var pitcher = courier.createSource('doc').index('fake').type('fake').id('fake')
          .doUpdate(update);

        // should update this
        var catcher = courier.createSource('doc').index('fake').type('fake').id('fake')
          .on('results', function (doc) {
            expect(doc._source).to.eql(update);
            done();
          });
      });

      it('clears the stored version when a document has been deleted', function (done) {
        var client = (function () {
          // fake server state
          var doc = { hi: 'fallacy' };

          return stubbedClient({
            delete: function (params, cb) {
              doc = null;
              cb(void 0, { ok: true });
            },
            default: function (method, params, cb) {
              if (doc) {
                cb(void 0, stubbedClient.doc({ _source: doc }));
              } else {
                cb(void 0, stubbedClient.doc({ found: false, _source: null, _version: null }));
              }
            }
          });
        }());
        var courier = createCourier(client);

        var source = courier.createSource('doc')
          .index('fake')
          .type('fake')
          .id('fake')
          .on('results', function (doc) {
            if (doc.found) {
              client.delete({}, function () {
                source.fetch();
              });
            } else {
              expect(courier._getRefFor(source).version).to.be(void 0);
              expect(source._getVersion()).to.be(void 0);
              done();
            }
          });

        courier.start();
      });

      it('checks localStorage for changes to the stored version, which will trigger the doc to be refetched', function (done) {
        var version = 11234;
        var courier = createCourier(stubbedClient(function (method, params, cb) {
          cb(void 0, stubbedClient.doc({ _version: version }));
        }));

        var count = 0;
        courier.docInterval(10);

        var source = courier.createSource('doc')
          .index('fake')
          .type('fake')
          .id('fake')
          .on('results', function (doc) {
            switch (count++) {
            case 0:
              // simulate removing the version in another tab
              localStorage.removeItem(source._versionKey());
              // get version should now be returning undefined
              expect(source._getVersion()).to.eql(void 0);
              // tell the courier to check docs 1 ms now
              courier.docInterval(1);
              break;
            case 1:
              // doc version should now be populated
              expect(source._getVersion()).to.eql(version);
              done();
            }
          });

        courier.start();
      });

      describe('#doIndex', function () {
        it('reindexes the doc using the hash passed in', function (done) {
          var client = (function () {
            var version = 1;
            var doc = { initial: true };

            return stubbedClient({
              index: function (params, cb) {
                doc = _.clone(params.body);
                version ++;
                cb(void 0, { ok: true });
              },
              mget: function (params, cb) {
                cb(void 0, stubbedClient.doc({ _version: version, _source: doc }));
              }
            });
          }());
          var courier = createCourier(client);

          var count = 0;
          courier.docInterval(10);

          var source = courier.createSource('doc')
            .index('fake')
            .type('fake')
            .id('fake')
            .on('results', function (doc) {
              switch (count ++) {
              case 0:
                expect(doc._source).to.have.property('initial', true);
                source.doIndex({ second: true });
                break;
              case 1:
                expect(doc._source).to.not.have.property('initial');
                expect(doc._source).to.have.property('second', true);
                done();
                break;
              }
            });

          courier.start();
        });
      });
    });
  };
});
*/