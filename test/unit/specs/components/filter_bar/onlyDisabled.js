define(function (require) {
  var onlyDisabled = require('components/filter_bar/lib/onlyDisabled');
  describe('Filter Bar Directive', function () {
    describe('onlyDisabled()', function () {

      it('should return true if all filters remove are disabled', function () {
        var filters = [
          { meta: { disabled: true } },
          { meta: { disabled: false } },
          { meta: { disabled: true } }
        ];
        var newFilters = [filters[1]];
        expect(onlyDisabled(newFilters, filters)).to.be(true);
      });

      it('should return true if all filters remove are disabled', function () {
        var filters = [
          { meta: { disabled: true } },
          { meta: { disabled: false } },
          { meta: { disabled: false } }
        ];
        var newFilters = [filters[1]];
        expect(onlyDisabled(newFilters, filters)).to.be(false);
      });

    });
  });
});
