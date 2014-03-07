define(function (require) {
  var createCourier = require('test_utils/create_courier');
  var _ = require('lodash');

  return function extendCourierSuite() {
    describe('source merging', function () {
      it('merges the state of one data source with it\'s parents', function () {
        var courier = createCourier();

        var root = courier.createSource('search')
          .index('people')
          .type('students')
          .filter({
            term: {
              school: 'high school'
            }
          });

        var math = courier.createSource('search')
          .inherits(root)
          .filter({
            terms: {
              classes: ['algebra', 'calculus', 'geometry'],
              execution: 'or'
            }
          })
          .on('results', _.noop);

        var query = math._flatten();
        expect(query.index).to.eql('people');
        expect(query.type).to.eql('students');
        expect(query.body).to.eql({
          query: {
            filtered: {
              query: { 'match_all': {} },
              filter: { bool: {
                must: [
                  { terms: { classes: ['algebra', 'calculus', 'geometry'], execution: 'or' } },
                  { term: { school: 'high school' } }
                ]
              } }
            }
          }
        });
      });
    });
  };
});