describe('_.pushAll', function () {
  let _ = require('lodash');
  let expect = require('expect.js');

  it('pushes an entire array into another', function () {
    let a = [1, 2, 3, 4];
    let b = [5, 6, 7, 8];

    let output = _.pushAll(b, a);
    expect(output).to.be(a);
    expect(a).to.eql([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(b).to.eql([5, 6, 7, 8]);
  });
});
