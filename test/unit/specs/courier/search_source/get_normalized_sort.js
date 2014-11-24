define(function (require) {
  describe('SearchSource#getNormalizedSort', function () {
    require('services/private');
    require('angular').module('getNormalizedSort', ['kibana']);

    var source;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      var SearchSource = Private(require('components/courier/data_source/search_source'));
      source = new SearchSource();
    }));

    [
      {
        sort: {
          starCount: 'asc'
        },
        normal: {
          starCount: 'asc'
        }
      },
      {
        sort: {
          starCount: 'desc'
        },
        normal: {
          starCount: 'desc'
        }
      },
      {
        sort: 'starCount',
        normal: {
          starCount: 'asc'
        }
      },
      {
        sort: [
          'starCount'
        ],
        normal: {
          starCount: 'asc'
        }
      },
      {
        sort: [
          'starCount',
          'name'
        ],
        normal: {
          starCount: 'asc',
          name: 'asc'
        }
      },
      {
        sort: [
          { name: 'asc' }
        ],
        normal: {
          name: 'asc'
        }
      },
      {
        sort: [
          { starCount: 'desc' },
          { name: 'asc' }
        ],
        normal: {
          starCount: 'desc',
          name: 'asc'
        }
      }
    ].forEach(function (test) {
      it('reads ' + JSON.stringify(test.sort) + ' properly', function () {
        source.sort(test.sort);
        var normal = source.getNormalizedSort();

        expect(normal).to.eql(test.normal);
      });
    });

  });
});