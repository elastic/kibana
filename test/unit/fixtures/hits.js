define(function (require) {
  var _ = require('lodash');
  return _.map([
    {_source: {timestamp: 0, bytes: 10, request: 'foo'}},
    {_source: {timestamp: 1, bytes: 20, request: 'bar'}},
    {_source: {timestamp: 2, bytes: 30, request: 'bar'}},
    {_source: {timestamp: 3, bytes: 30, request: 'baz'}},
    {_source: {timestamp: 4, bytes: 30, request: 'baz'}},
    {_source: {timestamp: 5, bytes: 30, request: 'baz'}},
    {_source: {timestamp: 6, bytes: 40, request: 'bat'}},
    {_source: {timestamp: 7, bytes: 40, request: 'bat'}},
    {_source: {timestamp: 8, bytes: 40, request: 'bat'}},
    {_source: {timestamp: 9, bytes: 40, request: 'bat'}},
  ], function (p, i) {
    return _.merge({}, p, {
      _score: 1,
      _id: 1000 + i,
      _type: 'test',
      _index: 'test-index'
    });
  });
});