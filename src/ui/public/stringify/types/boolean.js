import { asPrettyString } from 'ui/utils/as_pretty_string';
import { FieldFormat } from 'ui/index_patterns/_field_format/field_format';

export function stringifyBoolean() {

  class Bool extends FieldFormat {

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
          return asPrettyString(value);
      }
    }

    static id = 'boolean';
    static title = 'Boolean';
    static fieldType = ['boolean', 'number', 'string'];
  }

  return Bool;
}
