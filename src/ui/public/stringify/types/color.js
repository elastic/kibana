import 'ui/stringify/editors/color.less';
import _ from 'lodash';
import colorTemplate from 'ui/stringify/editors/color.html';
import StringifyTypesNumeralProvider from 'ui/stringify/types/_numeral';
import BoundToConfigObjProvider from 'ui/bound_to_config_obj';

export default function ColorFormatProvider(Private) {
  const Numeral = Private(StringifyTypesNumeralProvider);
  const BoundToConfigObj = Private(BoundToConfigObjProvider);
  
  const DEFAULT_COLOR = {
    range: `${Number.NEGATIVE_INFINITY}:${Number.POSITIVE_INFINITY}`,
    regex: '<insert regex>',
    text: '#000000',
    background: '#ffffff'
  };

  _.class(_Color).inherits(Numeral);
  function _Color(params) {
    _Color.Super.call(this, params);
  }

  _Color.id = 'color';
  _Color.title = 'Color';
  _Color.fieldType = [
    'number',
    'string'
  ];

  _Color.editor = {
    template: colorTemplate,
    controller($scope) {
      $scope.$watch('editor.field.type', type => {
        $scope.editor.formatParams.fieldType = type;
      });

      $scope.addColor = function () {
        $scope.editor.formatParams.colors.push(_.cloneDeep(DEFAULT_COLOR));
      };

      $scope.removeColor = function (index) {
        $scope.editor.formatParams.colors.splice(index, 1);
      };
    }
  };

  _Color.paramDefaults = new BoundToConfigObj({
    colors: [_.cloneDeep(DEFAULT_COLOR)],
    pattern: '=format:color:defaultPattern'
  });

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
      const color = _.findLast(this.param('colors'), ({ range }) => {
        if (!range) return;
        const [start, end] = range.split(':');
        return val >= Number(start) && val <= Number(end);
      });

      const formattedValue = Numeral.prototype._convert.call(this, val);
      if (!color) {
        return formattedValue;
      }

      const styleColor = color.text ? `color: ${color.text};` : '';
      const styleBackgroundColor = color.background ? `background-color: ${color.background};` : '';
      return `<span style="${styleColor}${styleBackgroundColor}">${formattedValue}</span>`;
    }
  };


  return _Color;
};
