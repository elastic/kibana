import _ from 'lodash';
import 'ui/field_format_editor/samples/samples';
import IndexPatternsFieldFormatFieldFormatProvider from 'ui/index_patterns/_field_format/FieldFormat';
export default function _StringProvider(Private) {
  var FieldFormat = Private(IndexPatternsFieldFormatFieldFormatProvider);


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

  _String.paramDefaults = {
    transform: false
  };

  _String.editor = require('ui/stringify/editors/string.html');

  _String.transformOpts = [
    { id: false, name: '- none -' },
    { id: 'lower', name: 'Lower Case' },
    { id: 'upper', name: 'Upper Case' },
    { id: 'short', name: 'Short Dots' },
    { id: 'base64', name: 'Base64 Decode'}
  ];

  _String.sampleInputs = [
    'A Quick Brown Fox.',
    'com.organizations.project.ClassName',
    'hostname.net',
    'SGVsbG8gd29ybGQ='
  ];

  _String.prototype._base64Decode = function (val) {
    try {
      return window.atob(val);
    } catch (e) {
      return _.asPrettyString(val);
    }
  };

  _String.prototype._convert = function (val) {
    switch (this.param('transform')) {
      case 'lower': return String(val).toLowerCase();
      case 'upper': return String(val).toUpperCase();
      case 'short': return _.shortenDottedString(val);
      case 'base64': return this._base64Decode(val);
      default: return _.asPrettyString(val);
    }
  };

  return _String;
};
