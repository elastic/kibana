define(function (require) {
  return ['tooltipFormatter', function () {
    var _ = require('lodash');
    var $ = require('jquery');

    var tooltipFormatter;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      tooltipFormatter = Private(require('components/agg_response/point_series/_tooltip_formatter'));
    }));

    function agg(name) {
      return {
        fieldFormatter: _.constant(function (v) { return '(' + v + ')'; }),
        makeLabel: _.constant(name)
      };
    }

    function cell($row, i) {
      return $row.eq(i).text().trim();
    }

    var baseEvent = {
      datum: {
        aggConfigResult: {
          aggConfig: agg('inner'),
          value: 3,
          $parent: {
            aggConfig: agg('middle'),
            value: 2,
            $parent: {
              aggConfig: agg('top'),
              value: 1
            }
          }
        }
      }
    };

    it('returns html based on the mouse event', function () {
      var event = _.cloneDeep(baseEvent);
      var $el = $(tooltipFormatter(event));
      var $rows = $el.find('tr');
      expect($rows.size()).to.be(3);

      var $row1 = $rows.eq(0).find('td');
      expect(cell($row1, 0)).to.be('inner');
      expect(cell($row1, 1)).to.be('(3)');

      var $row2 = $rows.eq(1).find('td');
      expect(cell($row2, 0)).to.be('middle');
      expect(cell($row2, 1)).to.be('(2)');

      var $row3 = $rows.eq(2).find('td');
      expect(cell($row3, 0)).to.be('top');
      expect(cell($row3, 1)).to.be('(1)');
    });
  }];
});