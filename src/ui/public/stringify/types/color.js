import _ from 'lodash';
import { DEFAULT_COLOR } from './color_default';
import { FieldFormat } from 'ui/index_patterns/_field_format/field_format';

export function stringifyColor() {

  const convertTemplate = _.template('<span style="<%- style %>"><%- val %></span>');

  _.class(_Color).inherits(FieldFormat);
  function _Color(params) {
    _Color.Super.call(this, params);
  }

  _Color.id = 'color';
  _Color.title = 'Color';
  _Color.fieldType = [
    'number',
    'string'
  ];

  _Color.prototype.getParamDefaults = function () {
    return {
      fieldType: null, // populated by editor, see controller below
      colors: [_.cloneDeep(DEFAULT_COLOR)]
    };
  };

  _Color.prototype.findColorRuleForVal = function (val) {
    switch (this.param('fieldType')) {
      case 'string':
        return _.findLast(this.param('colors'), (colorParam) => {
          return new RegExp(colorParam.regex).test(val);
        });

      case 'number':
        return _.findLast(this.param('colors'), ({ range }) => {
          if (!range) return;
          const [start, end] = range.split(':');
          return val >= Number(start) && val <= Number(end);
        });

      default:
        return null;
    }
  };

  _Color.prototype._convert = {
    html(val) {
      const color = this.findColorRuleForVal(val);
      if (!color) return _.asPrettyString(val);

      let style = '';
      if (color.text) style += `color: ${color.text};`;
      if (color.background) style += `background-color: ${color.background};`;
      return convertTemplate({ val, style });
    }
  };


  return _Color;
}
