define(function (require) {
  describe('SearchSource#normalizeSortRequest', function () {
    require('services/private');
    require('angular').module('normalizeSortRequest', ['kibana']);

    var normalizeSortRequest;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      normalizeSortRequest = Private(require('components/courier/data_source/_normalize_sort_request'));
    }));

    var normalizedSort = [{
      someField: {
        order: 'desc',
        unmapped_type: 'boolean'
      }
    }];

    it('make sure sort is an array', function () {
      var result = normalizeSortRequest(
        { someField: 'desc'}
      );
      expect(result).to.be.an(Array);
      expect(result).to.eql(normalizedSort);
    });

    it('makes plain string sort into the more verbose format', function () {
      var result = normalizeSortRequest(
        [{ someField: 'desc'}]
      );
      expect(result).to.eql(normalizedSort);
    });

    it('appends default sort options', function () {
      var result = normalizeSortRequest(
        [{
          someField: {
            order: 'desc',
            unmapped_type: 'boolean'
          }
        }]
      );
      expect(result).to.eql(normalizedSort);
    });

  });
});