import 'ui/stringify/editors/color.less';
import _ from 'lodash';
import IndexPatternsFieldFormatProvider from 'ui/index_patterns/_field_format/field_format';
import colorTemplate from 'ui/stringify/editors/color.html';
export default function ColorFormatProvider(Private) {

  const FieldFormat = Private(IndexPatternsFieldFormatProvider);
  const convertTemplate = _.template('<span style="<%- style %>"><%- val %></span>');
  const DEFAULT_COLOR = {
    range: `${Number.NEGATIVE_INFINITY}:${Number.POSITIVE_INFINITY}`,
    text: '#000000',
    background: '#ffffff'
  };

  _.class(_Color).inherits(FieldFormat);
  function _Color(params) {
    _Color.Super.call(this, params);
  }

  _Color.id = 'color';
  _Color.title = 'Color';
  _Color.fieldType = [
    'number'
  ];

  _Color.editor = {
    template: colorTemplate,
    controller($scope) {
      $scope.addColor = function () {
        $scope.editor.formatParams.colors.push(_.cloneDeep(DEFAULT_COLOR));
      };

      $scope.removeColor = function (index) {
        $scope.editor.formatParams.colors.splice(index, 1);
      };
    }
  };


  _Color.paramDefaults = {
    colors: [_.cloneDeep(DEFAULT_COLOR)]
  };

  _Color.prototype._convert = {
    html(val) {
      const color = _.findLast(this.param('colors'), ({ range }) => {
        if (!range) return;
        const [start, end] = range.split(':');
        return val >= Number(start) && val <= Number(end);
      });

      if (!color) return _.asPrettyString(val);

      let style = '';
      if (color.text) style += `color: ${color.text};`;
      if (color.background) style += `background-color: ${color.background};`;
      return convertTemplate({ val, style });
    }
  };

  return _Color;
};
