import d3 from 'd3';
define(function () {
  return function ChartSplitFactory() {

    /*
     * Adds div DOM elements to the `.chart-wrapper` element based on the data layout.
     * For example, if the data has rows, it returns the same number of
     * `.chart` elements as row objects.
     */
    return function split(selection, parent) {
      selection.each(function (data) {
        const div = d3.select(this)
        .attr('class', function () {
          if (data.rows) {
            return 'chart-wrapper-row';
          } else if (data.columns) {
            return 'chart-wrapper-column';
          } else {
            if (parent) {
              return 'chart-first chart-last chart-wrapper';
            }
            return this.className + ' chart-wrapper';
          }
        });
        let divClass = '';
        let chartsNumber;

        const charts = div.selectAll('charts')
        .append('div')
        .data(function (d) {
          if (d.rows) {
            chartsNumber = d.rows.length;
            return d.rows;
          } else if (d.columns) {
            chartsNumber = d.columns.length;
            return d.columns;
          } else {
            divClass = 'chart';
            chartsNumber = 1;
            return [d];
          }
        })
        .enter()
          .append('div')
          .attr('class', function (d, i) {
            let fullDivClass = divClass;
            if (chartsNumber > 1) {
              if (i === 0) {
                fullDivClass += ' chart-first';
              } else if (i === chartsNumber - 1) {
                fullDivClass += ' chart-last';
              }
            }
            return fullDivClass;
          });

        if (!data.series) {
          charts.call(split);
        }
      });
    };
  };
});
