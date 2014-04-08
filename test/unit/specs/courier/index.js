define(function (require) {
  require('angular-mocks');

  describe('Courier Module', function () {
    var HastyRefresh;
    var courier;

    before(function () {
      inject(function (couriersErrors, _courier_) {
        HastyRefresh = couriersErrors.HastyRefresh;
        courier = _courier_;
      });
    });

    afterEach(function () {
      courier.close();
    });

    // describe('sync API', function () {
    //   require('./create_source')();
    //   require('./start_stop')();
    //   require('./calculate_indices')();
    //   require('./create_source')();
    //   require('./abort')();
    //   require('./on_fetch')();
    //   require('./source_merging')();
    // });

    // require('./data_source')();
    // require('./doc_source')();
    // require('./mapper')();
  });
});