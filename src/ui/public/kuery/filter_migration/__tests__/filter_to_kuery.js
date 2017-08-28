import _ from 'lodash';
import expect from 'expect.js';
import { filterToKueryAST } from '../filter_to_kuery';
import { expectDeepEqual } from '../../../../../test_utils/expect_deep_equal.js';

describe('filter to kuery migration', function () {

  describe('filterToKueryAST', function () {

    it('should hand off conversion of known filter types to the appropriate converter', function () {
      const filter = {
        meta: {
          type: 'exists',
          key: 'foo',
        }
      };
      const result = filterToKueryAST(filter);

      expect(result).to.have.property('type', 'function');
      expect(result).to.have.property('function', 'exists');
    });

    it('should thrown an error when an unknown filter type is encountered', function () {
      const filter = {
        meta: {
          type: 'foo',
        }
      };

      expect(filterToKueryAST).withArgs(filter).to.throwException(/Couldn't convert that filter to a kuery/);
    });

    it('should wrap the AST node of negated filters in a "not" function', function () {
      const filter = {
        meta: {
          type: 'exists',
          key: 'foo',
        }
      };
      const negatedFilter = _.set(_.cloneDeep(filter), 'meta.negate', true);

      const result = filterToKueryAST(filter);
      const negatedResult = filterToKueryAST(negatedFilter);

      expect(negatedResult).to.have.property('type', 'function');
      expect(negatedResult).to.have.property('function', 'not');
      expectDeepEqual(negatedResult.arguments[0], result);
    });

  });

});
