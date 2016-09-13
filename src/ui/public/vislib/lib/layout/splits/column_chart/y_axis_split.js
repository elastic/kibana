import d3 from 'd3';
define(function () {
  return function YAxisSplitFactory() {

    /*
     * Adds div DOM elements to the `.y-axis-div-wrapper` element based on the data layout.
     * For example, if the data has rows, it returns the same number of
     * `.y-axis-div` elements as row objects.
     */

    // render and get bounding box width
    return function (selection) {

      selection.each(function () {
        const div = d3.select(this);
        let rows;

        div.selectAll('.y-axis-div')
        .append('div')
        .data(function (d) {
          rows = d.rows ? d.rows.length : 1;
          return d.rows ? d.rows : [d];
        })
        .enter()
          .append('div')
          .attr('class', (d, i) => {
            let divClass = '';
            if (i === 0) {
              divClass += ' chart-first';
            }
            if (i === rows - 1) {
              divClass += ' chart-last';
            }
            return 'y-axis-div axis-div' + divClass;
          });
      });
    };
  };
});
