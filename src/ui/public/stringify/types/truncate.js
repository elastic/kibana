import _ from 'lodash';

import { FieldFormat } from 'ui/index_patterns/_field_format/field_format';

export function stringifyTruncate() {
  const omission = '...';

  class TruncateFormat extends FieldFormat {
    constructor(params) {
      super(params);
    }

    _convert(val) {
      const length = this.param('fieldLength');
      if (length > 0) {
        return _.trunc(val, {
          'length': length + omission.length,
          'omission': omission
        });
      }

      return val;
    }
  }

  TruncateFormat.id = 'truncate';
  TruncateFormat.title = 'Truncated String';
  TruncateFormat.fieldType = ['string'];

  return TruncateFormat;
}
