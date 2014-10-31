define(function (require) {
  var arrayToLinkedList = require('components/agg_response/hierarchical/_array_to_linked_list');
  describe('buildHierarchicalData()', function () {
    describe('arrayToLinkedList', function () {

      var results;
      beforeEach(function () {
        results = arrayToLinkedList([
          { id: 1 },
          { id: 2 },
          { id: 3 }
        ]);
      });

      it('should set the next element', function () {
        expect(results[0]).to.have.property('_next', results[1]);
        expect(results[1]).to.have.property('_next', results[2]);
      });

      it('should set the previous element', function () {
        expect(results[1]).to.have.property('_previous', results[0]);
        expect(results[2]).to.have.property('_previous', results[1]);
      });

    });
  });
});
