define(function (require) {
  var _ = require('lodash');
  var longString = Array(200).join('_');

  return function (id, mapping) {
      var columns = _.keys(mapping);
      return {
        _formatted: _.zipObject(_.map(columns, function (c) { return [c, c + '_formatted_' + id + longString]; })),
        _source: _.zipObject(_.map(columns, function (c) { return [c, c + '_original_' + id + longString]; })),
        _id: id,
        _index: 'test',
        sort: [id]
      };
    };
});