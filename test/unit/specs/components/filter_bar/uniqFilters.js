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

      it('should filter out duplicates, ignoring meta attributes', function () {
        var before = [
          {
            meta: { negate: true },
            query: { _type: { match: { query: 'apache', type: 'phrase' } } }
          },
          {
            meta: { negate: false },
            query: { _type: { match: { query: 'apache', type: 'phrase' } } }
          }
        ];
        var results = uniqFilters(before);
        expect(results).to.have.length(1);
      });

      it('should filter out duplicates, ignoring $state attributes', function () {
        var before = [
          {
            $state: { store: 'appState' },
            query: { _type: { match: { query: 'apache', type: 'phrase' } } }
          },
          {
            $state: { store: 'globalState' },
            query: { _type: { match: { query: 'apache', type: 'phrase' } } }
          }
        ];
        var results = uniqFilters(before);
        expect(results).to.have.length(1);
      });
    });
  });
});
