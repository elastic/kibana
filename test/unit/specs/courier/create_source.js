define(function (require) {
  var SearchSource = require('components/courier/data_source/search_source');
  var DocSource = require('components/courier/data_source/doc_source');

  return function extendCourierSuite() {
    inject(function (courier) {
      describe('#createSource', function () {
        it('creates an empty search DataSource object', function () {
          var source = courier.createSource();
          expect(source._state).to.eql({});
        });

        it('optionally accepts a type for the DataSource', function () {
          expect(courier.createSource()).to.be.a(SearchSource);
          expect(courier.createSource('search')).to.be.a(SearchSource);
          expect(courier.createSource('doc')).to.be.a(DocSource);
          expect(function () {
            courier.createSource('invalid type');
          }).to.throwError(TypeError);
        });

        it('optionally accepts a json object/string that will populate the DataSource object with settings', function () {
          var savedState = JSON.stringify({
            _type: 'doc',
            index: 'logstash-[YYYY-MM-DD]',
            type: 'nginx',
            id: '1'
          });
          var source = courier.createSource('doc', savedState);
          expect(source + '').to.eql(savedState);
        });
      });
    });
  };
});