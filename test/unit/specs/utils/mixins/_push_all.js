define(function (require) {
  return ['_.pushAll', function () {
    var _ = require('lodash');

    it('pushes an entire array into another', function () {
      var a = [1, 2, 3, 4];
      var b = [5, 6, 7, 8];

      var output = _.pushAll(b, a);
      expect(output).to.be(a);
      expect(a).to.eql([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(b).to.eql([5, 6, 7, 8]);
    });
  }];
});
