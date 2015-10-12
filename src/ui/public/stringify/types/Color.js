define(function (require) {
  return function _StringProvider(Private) {
    require('ui/stringify/editors/color.less');

    const _ = require('lodash');
    const FieldFormat = Private(require('ui/index_patterns/_field_format/FieldFormat'));
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
      template: require('ui/stringify/editors/color.html'),
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

        const styleColor = color.text ? `color: ${color.text};` : '';
        const styleBackgroundColor = color.background ? `background-color: ${color.background};` : '';
        return `<span style="${styleColor}${styleBackgroundColor}">${_.escape(val)}</span>`;
      }
    };

    return _Color;
  };
});
