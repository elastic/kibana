import _ from 'lodash';
import expect from 'expect.js';
import addWordBreaks from 'ui/utils/add_word_breaks';

describe('addWordBreaks', function () {

  let fixtures = [
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
    let msg = 'should convert ' + fixture[0] + ' to ' + fixture[1];
    it(msg, function () {
      let results = addWordBreaks(fixture[0], 10);
      expect(results).to.be(fixture[1]);
    });
  });
});
