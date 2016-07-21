define(function (require) {
  return function FieldListProvider(Private) {
    var Field = Private(require('ui/index_patterns/_field'));
    var IndexedArray = require('ui/IndexedArray');
    var _ = require('lodash');

    _.class(FieldList).inherits(IndexedArray);
    function FieldList(indexPattern, specs) {
      FieldList.Super.call(this, {
        index: ['name'],
        group: ['type'],
        initialSet: specs.map(function (field) {
          return new Field(indexPattern, field);
        })
      });
    }

    return FieldList;
  };
});
