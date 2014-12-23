define(function (require) {
  var _ = require('lodash');
  var addWordBreaks = require('utils/add_word_breaks');

  describe('addWordBreaks', function () {

    var fixtures = [
      ['aaaaaaaaaaaaaaaaaaaa', 'aaaaaaaaaaa<wbr>aaaaaaaaa'],
      ['aaaa aaaaaaaaaaaaaaa', 'aaaa aaaaaaaaaaa<wbr>aaaa'],
      ['aaaa;aaaaaaaaaaaaaaa', 'aaaa;aaaaaaaaaaa<wbr>aaaa'],
      ['aaaa&aaaaaaaaaaaaaaa', 'aaaa&aaaaaaaaaaa<wbr>aaaa'],
      ['aaaa:aaaaaaaaaaaaaaa', 'aaaa:aaaaaaaaaaa<wbr>aaaa'],
      ['aaaa,aaaaaaaaaaaaaaa', 'aaaa,aaaaaaaaaaa<wbr>aaaa'],
      ['aaaa aaaa', 'aaaa aaaa'],
      ['aaaa <mark>aaaa</mark>aaaaaaaaaaaa', 'aaaa <mark>aaaa</mark>aaaaaaaaaaa<wbr>a']
    ];

    _.each(fixtures, function (fixture) {
      var msg = 'should convert ' + fixture[0] + ' to ' + fixture[1];
      it(msg, function () {
        var results = addWordBreaks(fixture[0], 10);
        expect(results).to.be(fixture[1]);
      });
    });
  });
});
