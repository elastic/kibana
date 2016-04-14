define(function (require) {
  return function FieldListProvider(Private) {
    let Field = Private(require('ui/index_patterns/_field'));
    let IndexedArray = require('ui/IndexedArray');
    let _ = require('lodash');

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
