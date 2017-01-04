import IndexPatternsFieldFormatProvider from 'ui/index_patterns/_field_format/field_format';
import _ from 'lodash';

export default function TruncateFormatProvider(Private) {

  const FieldFormat = Private(IndexPatternsFieldFormatProvider);

  class Bool extends FieldFormat {

    constructor(params) {
      super(params);
    }

    _convert(value) {

      if (typeof value === 'string') {
        value = value.trim().toLowerCase();
      }

      switch (value) {
        case false:
        case 0:
        case 'false':
        case 'no':
          return 'false';
        case true:
        case 1:
        case 'true':
        case 'yes':
          return 'true';
        default:
          return _.asPrettyString(value);
      }
    }
  }

  Bool.id = 'boolean';
  Bool.title = 'Boolean';
  Bool.fieldType = ['boolean', 'number', 'string'];

  return Bool;
}
