import _ from 'lodash';
import { asPrettyString } from 'ui/utils/as_pretty_string';
import { FieldFormat } from 'ui/index_patterns/_field_format/field_format';
import { shortenDottedString } from 'ui/utils/shorten_dotted_string';

export function stringifyString() {
  _.class(_String).inherits(FieldFormat);
  function _String(params) {
    _String.Super.call(this, params);
  }

  _String.id = 'string';
  _String.title = 'String';
  _String.fieldType = [
    'number',
    'boolean',
    'date',
    'ip',
    'attachment',
    'geo_point',
    'geo_shape',
    'string',
    'murmur3',
    'unknown',
    'conflict'
  ];

  _String.prototype.getParamDefaults = function () {
    return {
      transform: false
    };
  };

  _String.prototype._base64Decode = function (val) {
    try {
      return window.atob(val);
    } catch (e) {
      return asPrettyString(val);
    }
  };

  _String.prototype._toTitleCase = function (val) {
    return val.replace(/\w\S*/g, txt => { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
  };

  _String.prototype._convert = function (val) {
    switch (this.param('transform')) {
      case 'lower': return String(val).toLowerCase();
      case 'upper': return String(val).toUpperCase();
      case 'title': return this._toTitleCase(val);
      case 'short': return shortenDottedString(val);
      case 'base64': return this._base64Decode(val);
      default: return asPrettyString(val);
    }
  };

  return _String;
}
