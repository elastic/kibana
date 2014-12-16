define(function (require) {
  var uniqFilters = require('components/filter_bar/lib/uniqFilters');
  describe('Filter Bar Directive', function () {
    describe('uniqFilter', function () {

      it('should filter out dups', function () {
        var before = [
          { query: { _type: { match: { query: 'apache', type: 'phrase' } } } },
          { query: { _type: { match: { query: 'apache', type: 'phrase' } } } }
        ];
        var results = uniqFilters(before);
        expect(results).to.have.length(1);
      });

    });
  });
});
