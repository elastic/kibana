import { IndexedArray } from 'ui/indexed_array';
import _ from 'lodash';
import { IndexPatternsFieldProvider } from 'ui/index_patterns/_field';

export function IndexPatternsFieldListProvider(Private) {
  const Field = Private(IndexPatternsFieldProvider);

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
}
