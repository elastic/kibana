import _ from 'lodash';
import expect from 'expect.js';
describe('_.pushAll', function () {

  it('pushes an entire array into another', function () {
    const a = [1, 2, 3, 4];
    const b = [5, 6, 7, 8];

    const output = _.pushAll(b, a);
    expect(output).to.be(a);
    expect(a).to.eql([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(b).to.eql([5, 6, 7, 8]);
  });
});
