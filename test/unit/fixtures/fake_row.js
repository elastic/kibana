define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var longString = Array(200).join('_');

  return function (id, mapping) {
    var fake = {
      _formatted: _.mapValues(mapping, function (f, c) { return c + '_formatted_' + id + longString; }),
      _source: _.mapValues(mapping, function (f, c) { return c + '_original_' + id + longString; }),
      _id: id,
      _index: 'test',
      sort: [id]
    };

    fake._formatted._source = '_source_formatted_' + id + longString;

    return fake;
  };
});