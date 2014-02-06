define(function (require) {
  var calculateClass = require('panels/marvel/shard_allocation/lib/calculateClass');
  describe('shard_allocation', function () {
    describe('lib/calculateClass.js', function() {

      beforeEach(function () {
        this.item = {
          type: 'shard',
          primary: true,
          state: 'UNASSIGNED',
          master: true
        };
      });

      function testForClass (className) {
        it('should add the '+className+' class', function() {
          expect(calculateClass(this.item)).to.contain(className);
        });
      }

      testForClass('shard');
      testForClass('primary');
      testForClass('master');
      testForClass('emergency');
      testForClass('unassigned');

      it('should preserve initial classes', function () {
        var classes = calculateClass(this.item, 'test');
        expect(classes).to.contain('unassigned');
        expect(classes).to.contain('test');
      });

    });

  });
});
