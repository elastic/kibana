import d3 from 'd3';
define(function () {
  return function XAxisSplitFactory() {

    /*
     * Adds div DOM elements to the `.x-axis-div-wrapper` element based on the data layout.
     * For example, if the data has rows, it returns the same number of
     * `.x-axis-div` elements as row objects.
     */

    return function (selection) {
      selection.each(function () {
        const div = d3.select(this);
        let columns;
        div.selectAll('.x-axis-div')
        .append('div')
        .data(function (d) {
          columns = d.columns ? d.columns.length : 1;
          return d.columns ? d.columns : [d];
        })
        .enter()
          .append('div')
          .attr('class', (d, i) => {
            let divClass = '';
            if (i === 0) {
              divClass += ' chart-first';
            }
            if (i === columns - 1) {
              divClass += ' chart-last';
            }
            return 'x-axis-div axis-div' + divClass;
          });
      });
    };
  };
});
