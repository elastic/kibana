define(function (require) {
  var createCourier = require('test_utils/create_courier');
  var SearchSource = require('courier/data_source/search');
  var DocSource = require('courier/data_source/doc');

  return function extendCourierSuite() {
    describe('#createSource', function () {
      it('creates an empty search DataSource object', function () {
        var courier = createCourier();
        var source = courier.createSource();
        expect(source._state).to.eql({});
      });

      it('optionally accepts a type for the DataSource', function () {
        var courier = createCourier();
        expect(courier.createSource()).to.be.a(SearchSource);
        expect(courier.createSource('search')).to.be.a(SearchSource);
        expect(courier.createSource('doc')).to.be.a(DocSource);
        expect(function () {
          courier.createSource('invalid type');
        }).to.throwError(TypeError);
      });

      it('optionally accepts a json object/string that will populate the DataSource object with settings', function () {
        var courier = createCourier();
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
  };
});