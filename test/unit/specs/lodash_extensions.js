describe('Lodash mixins', function () {
  var _;

  before(function (done) {
    // load modules using require.js once we are ready to being
    require(['lodash'], function (__) {
      _ = __;
      done();
    });
  });

  describe('#move', function () {
    it('moves the specified element within the array', function() {
      var arr = [1,2,3];
      _.move(arr, 0, 1);

      expect(arr[0]).to.be(2);
      expect(arr[1]).to.be(1);
    });
  });

  describe('#remove', function () {
    it('removes an element from the array', function () {
      var arr = [1,2,3];
      _.remove(arr, 2);
      expect(arr).to.eql([1,2]);
    });
  });

  describe('#toggle', function () {
    it('returns either value or alt based on if the variable matches the standard value', function () {
      expect(_.toggle(1, 1, true)).to.be.ok();
      expect(_.toggle(1, 2, 1)).to.be(2);
    });
  });

  describe('#toggleInOut', function () {
    it('adds the value to an array if it is not already present', function () {
      var arr = _.toggleInOut([1,2,3,5,6], 4);
      expect(_.contains(arr, 4)).to.ok();
    });
    it('removes the value from an array if it is already present', function () {
      var arr = _.toggleInOut([1,2,3,4,5,6], 4);
      expect(_.contains(arr, 4)).to.not.be.ok();
    });
  });
});