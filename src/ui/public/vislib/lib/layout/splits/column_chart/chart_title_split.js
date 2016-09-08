import d3 from 'd3';
import $ from 'jquery';

define(function () {
  return function ChartTitleSplitFactory() {

    /*
     * Adds div DOM elements to either the `.y-axis-chart-title` element or the
     * `.x-axis-chart-title` element based on the data layout.
     * For example, if the data has rows, it returns the same number of
     * `.chart-title` elements as row objects.
     * if not data.rows or data.columns, return no chart titles
     */
    return function (selection) {
      selection.each(function (data) {
        const div = d3.select(this);
        const parent = $(this).parents('.vis-wrapper');

        if (!data.series) {
          div.selectAll('.chart-title')
          .data(function (d) {
            return d.rows ? d.rows : d.columns;
          })
          .enter()
            .append('div')
            .attr('class', 'chart-title');

          if (data.rows) {
            parent.find('.x-axis-chart-title').remove();
          } else {
            parent.find('.y-axis-chart-title').remove();
          }

          return div;
        }

        return d3.select(this).remove();
      });
    };
  };
});
