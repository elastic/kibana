var checkDependencies = require('../../../../../src/server/lib/plugins/check_dependencies');
var expect = require('expect.js');

describe('src/server/lib/check_dependencies', function () {

  it('should return true for first -> second -> third', function () {
    var deps = {
      first: [],
      second: ['first'],
      third: ['second']
    };

    var results = checkDependencies('first', deps);
    expect(results).to.be(true);
  });

  it('should throw an error for first -> third -> second -> first', function () {
    var deps = {
      first: ['third'],
      second: ['first'],
      third: ['second']
    };

    var run = function () {
      checkDependencies('first', deps);
    };
    expect(run).to.throwException(function (e) {
      expect(e.message).to.be('Circular dependency: first -> third -> second -> first');
    });
  });

  it('should throw an error for first -> missing', function () {
    var deps = {
      first: ['missing']
    };

    var run = function () {
      checkDependencies('first', deps);
    };
    expect(run).to.throwException(function (e) {
      expect(e.message).to.be('Missing dependency: missing');
    });
  });

  it('should throw an error for missing dependency', function () {
    var deps = {
      first: ['missing']
    };

    var run = function () {
      checkDependencies('missing', deps);
    };
    expect(run).to.throwException(function (e) {
      expect(e.message).to.be('Missing dependency: missing');
    });
  });

  it('should throw an error on complex circulars', function () {
    var deps = {
      first: ['second', 'fifth'],
      second: ['fourth'],
      third: [],
      fourth: ['third'],
      fifth: ['sixth'],
      sixth: ['first']
    };

    var run = function () {
      checkDependencies('first', deps);
    };
    expect(run).to.throwException(function (e) {
      expect(e.message).to.be('Circular dependency: first -> fifth -> sixth -> first');
    });
  });

});
