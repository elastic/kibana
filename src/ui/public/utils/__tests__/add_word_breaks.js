import _ from 'lodash';
import expect from 'expect.js';
import addWordBreaks from 'ui/utils/add_word_breaks';

describe('addWordBreaks', function () {

  const fixtures = [
    ['aaaaaaaaaaaaaaaaaaaa', 'aaaaaaaaaaa<wbr>aaaaaaaaa'],
    ['aaaa aaaaaaaaaaaaaaa', 'aaaa aaaaaaaaaaa<wbr>aaaa'],
    ['aaaa;aaaaaaaaaaaaaaa', 'aaaa;aaaaaaaaaaa<wbr>aaaa'],
    ['aaaa:aaaaaaaaaaaaaaa', 'aaaa:aaaaaaaaaaa<wbr>aaaa'],
    ['aaaa,aaaaaaaaaaaaaaa', 'aaaa,aaaaaaaaaaa<wbr>aaaa'],
    ['aaaa aaaa', 'aaaa aaaa'],
    ['aaaa <mark>aaaa</mark>aaaaaaaaaaaa', 'aaaa <mark>aaaa</mark>aaaaaaaaaaa<wbr>a'],
    ['aaaa&quot;aaaaaaaaaaaa', 'aaaa&quot;aaaaaaaaaaa<wbr>a']
  ];

  _.each(fixtures, function (fixture) {
    const msg = 'should convert ' + fixture[0] + ' to ' + fixture[1];
    it(msg, function () {
      const results = addWordBreaks(fixture[0], 10);
      expect(results).to.be(fixture[1]);
    });
  });
});
