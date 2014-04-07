define(function (require) {
  var _ = require('lodash');

  require('angular-mocks');

  return function extendCourierSuite() {
    inject(function (es, courier) {
      describe('#abort', function () {
        it('calls abort on the current request if it exists', function () {
          courier
            .createSource('search')
            .on('results', _.noop);

          courier.abort();
          expect(es.abortCalled).to.eql(0);

          courier.fetch('search');
          courier.abort();
          expect(es.abortCalled).to.eql(1);
        });
      });
    });
  };
});