import { FieldFormat } from 'ui/index_patterns/_field_format/field_format';

export function stringifyIp() {

  class IpFormat extends FieldFormat {
    constructor(params) {
      super(params);
    }

    _convert(val) {
      if (val === undefined || val === null) return '-';
      if (!isFinite(val)) return val;

      // shazzam!
      return [val >>> 24, val >>> 16 & 0xFF, val >>> 8 & 0xFF, val & 0xFF].join('.');
    }
  }

  IpFormat.id = 'ip';
  IpFormat.title = 'IP Address';
  IpFormat.fieldType = 'ip';

  return IpFormat;
}
