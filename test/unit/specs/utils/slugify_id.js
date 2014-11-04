define(function (require) {
  var _ = require('lodash');
  var slugifyId = require('utils/slugify_id');

  describe('slugifyId()', function () {

    var fixtures = [
      ['test/test', 'test-slash-test'],
      ['test?test', 'test-questionmark-test'],
      ['test=test', 'test-equal-test'],
      ['test&test', 'test-ampersand-test'],
      ['test / test', 'test-slash-test'],
      ['test ? test', 'test-questionmark-test'],
      ['test = test', 'test-equal-test'],
      ['test & test', 'test-ampersand-test'],
      ['test / ^test', 'test-slash-^test'],
      ['test ?  test', 'test-questionmark-test'],
      ['test =  test', 'test-equal-test'],
      ['test &  test', 'test-ampersand-test']
    ];

    _.each(fixtures, function (fixture) {
      var msg = 'should convert ' + fixture[0] + ' to ' + fixture[1];
      it(msg, function () {
        var results = slugifyId(fixture[0]);
        expect(results).to.be(fixture[1]);
      });
    });

    it('should do nothing if the id is undefined', function () {
      expect(slugifyId(undefined)).to.be(undefined);
    });

  });
});
