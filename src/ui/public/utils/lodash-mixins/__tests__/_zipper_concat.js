describe('_.zipperConcat', function () {
  var _ = require('lodash');
  var expect = require('expect.js');

  it('merges two arrays', function () {
    var a = [1, 2, 3];
    var b = [4, 5, 6];

    var output = _.zipperConcat(a, b);
    expect(output).to.eql([
      1, 4,
      2, 5,
      3, 6,
    ]);
  });

  it('merges three arrays', function () {
    var a = [1, 2, 3];
    var b = [4, 5, 6];
    var c = [7, 8, 9];

    var output = _.zipperConcat(a, b, c);
    expect(output).to.eql([
      1, 4, 7,
      2, 5, 8,
      3, 6, 9,
    ]);
  });
});
