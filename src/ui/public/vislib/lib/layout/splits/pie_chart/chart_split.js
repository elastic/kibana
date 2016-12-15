import d3 from 'd3';
define(function () {
  return function ChartSplitFactory() {

    /*
     * Adds div DOM elements to the `.chart-wrapper` element based on the data layout.
     * For example, if the data has rows, it returns the same number of
     * `.chart` elements as row objects.
     */

    return function split(selection) {
      selection.each(function (data) {
        const div = d3.select(this)
        .attr('class', function () {
          if (data.rows) {
            return 'chart-wrapper-row';
          } else if (data.columns) {
            return 'chart-wrapper-column';
          } else {
            return 'chart-wrapper';
          }
        });
        let divClass;

        const charts = div.selectAll('charts')
        .append('div')
        .data(function (d) {
          if (d.rows) {
            divClass = 'chart-row';
            return d.rows;
          } else if (d.columns) {
            divClass = 'chart-column';
            return d.columns;
          } else {
            divClass = 'chart';
            return [d];
          }
        })
        .enter()
          .append('div')
          .attr('class', function () {
            return divClass;
          });

        if (!data.slices) {
          charts.call(split);
        }
      });
    };
  };
});
