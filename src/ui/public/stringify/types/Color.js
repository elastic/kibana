define(function (require) {
  return function _StringProvider(Private) {
    var _ = require('lodash');
    var FieldFormat = Private(require('ui/index_patterns/_field_format/FieldFormat'));

    require('ui/field_format_editor/samples/samples');

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
          $scope.editor.formatParams.colors.push({});
        };

        $scope.removeColor = function (index) {
          $scope.editor.formatParams.colors.splice(index, 1);
        };
      }
    };

    _Color.sampleInputs = [0, 50, 100, 150, 200];

    _Color.paramDefaults = {
      colors: [{
        range: `${Number.NEGATIVE_INFINITY}:${Number.POSITIVE_INFINITY}`,
        color: '#000',
        backgroundColor: '#FFF'
      }]
    };

    _Color.prototype._convert = {
      html(val) {
        var range = _.findLast(this.param('colors'), function (color) {
          if (!color.range) return;

          const rangeValues = color.range.split(':');
          if (rangeValues.length !== 2) return;

          const start = Number(rangeValues[0]);
          const end = Number(rangeValues[1]);
          return val >= start && val <= end;
        });

        if (!range) return _.asPrettyString(val);

        const styleColor = range.color ? `color: ${range.color};` : '';
        const styleBackgroundColor = range.backgroundColor ? `background-color: ${range.backgroundColor};` : '';
        return `<span style="${styleColor}${styleBackgroundColor}">${_.escape(val)}</span>`;
      }
    };

    return _Color;
  };
});
