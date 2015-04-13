define(function (require) {
  var moment = require('moment');
  describe('Query decorator', function () {

    var _ = require('lodash');
    var config;

    var indexPattern, getComputedFields, fn;
    beforeEach(function () {
      module('kibana');

      module('kibana', function ($provide) {

        // Super simple config stub
        $provide.service('config', function () {
          var keys = {};
          return {
            get: function (key) { return keys[key]; },
            set: function (key, value) { keys[key] = value; }
          };
        });
      });
    });

    beforeEach(inject(function (Private, $injector, _config_) {
      config = _config_;
      fn = Private(require('components/courier/data_source/_decorate_query'));
    }));

    it('should be a function', function () {
      expect(fn).to.be.a(Function);
    });

    it('should merge in the query string options', function () {
      config.set('query:queryString:options', {analyze_wildcard: true});
      expect(fn({query_string: {query: '*'}})).to.eql({query_string: {query: '*', analyze_wildcard: true}});
    });

  });
});