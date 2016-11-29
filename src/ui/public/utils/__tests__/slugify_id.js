import _ from 'lodash';
import slugifyId from 'ui/utils/slugify_id';
import expect from 'expect.js';

describe('slugifyId()', function () {

  let fixtures = [
    ['test/test', 'test-slash-test'],
    ['test?test', 'test-questionmark-test'],
    ['test=test', 'test-equal-test'],
    ['test&test', 'test-ampersand-test'],
    ['test%test', 'test-percent-test'],
    ['test / test', 'test-slash-test'],
    ['test ? test', 'test-questionmark-test'],
    ['test = test', 'test-equal-test'],
    ['test & test', 'test-ampersand-test'],
    ['test % test', 'test-percent-test'],
    ['test / ^test', 'test-slash-^test'],
    ['test ?  test', 'test-questionmark-test'],
    ['test =  test', 'test-equal-test'],
    ['test &  test', 'test-ampersand-test'],
    ['test %  test', 'test-percent-test'],
    ['test/test/test', 'test-slash-test-slash-test'],
    ['test?test?test', 'test-questionmark-test-questionmark-test'],
    ['test&test&test', 'test-ampersand-test-ampersand-test'],
    ['test=test=test', 'test-equal-test-equal-test'],
    ['test%test%test', 'test-percent-test-percent-test']
  ];

  _.each(fixtures, function (fixture) {
    let msg = 'should convert ' + fixture[0] + ' to ' + fixture[1];
    it(msg, function () {
      let results = slugifyId(fixture[0]);
      expect(results).to.be(fixture[1]);
    });
  });

  it('should do nothing if the id is undefined', function () {
    expect(slugifyId(undefined)).to.be(undefined);
  });

});
