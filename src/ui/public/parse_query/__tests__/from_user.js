var pluck = require('lodash').pluck;
var moment = require('moment');
var tests = require('./test_queries.json');
var fromUser = require('../lib/from_user.js');
var fields = require('./test_fields.json');

describe('Jison Query Parser', function () {
  describe('query tests', function () {
    var expect = require('expect.js');

    fromUser.setIndexPattern(fields);

    it('Each query test should pass', function () {
      for (var test in tests) {
        if (tests.hasOwnProperty(test)) {
          expect(fromUser.fromUser(test.query)).to.eql(test.result);
        }
      }
    });
  });
});
