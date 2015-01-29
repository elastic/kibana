define(function (require) {
  var _ = require('lodash');
  var collectBranch = require('components/agg_response/hierarchical/_collect_branch');
  describe('collectBranch()', function () {
    var results;
    var convert = function (name) {
      return 'converted:' + name;
    };

    beforeEach(function () {
      results = collectBranch({
        name: 'bucket3',
        depth: 3,
        size: 6,
        field: { format: { convert: convert } },
        aggConfig: { params: { field: { displayName: 'field3' } }, fieldFormatter: _.constant(String) },
        parent: {
          name: 'bucket2',
          depth: 2,
          size: 12,
          aggConfig: { label: 'field2', fieldFormatter: _.constant(String) },
          parent: {
            name: 'bucket1',
            depth: 1,
            size: 24,
            parent: {}
          }
        }
      });
    });

    it('should return an array with bucket objects', function () {
      expect(results).to.be.an(Array);
      expect(results).to.have.length(3);

      expect(results[0]).to.have.property('metric', 24);
      expect(results[0]).to.have.property('depth', 0);
      expect(results[0]).to.have.property('bucket', 'bucket1');
      expect(results[0]).to.have.property('field', 'level 1');
      expect(results[0]).to.have.property('aggConfig');

      expect(results[1]).to.have.property('metric', 12);
      expect(results[1]).to.have.property('depth', 1);
      expect(results[1]).to.have.property('bucket', 'bucket2');
      expect(results[1]).to.have.property('field', 'field2');
      expect(results[1]).to.have.property('aggConfig');

      expect(results[2]).to.have.property('metric', 6);
      expect(results[2]).to.have.property('depth', 2);
      expect(results[2]).to.have.property('bucket', 'bucket3');
      expect(results[2]).to.have.property('field', 'field3');
      expect(results[2]).to.have.property('aggConfig');

    });

  });
});
