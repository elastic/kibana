define(function () {
  return function XAxisSplitFactory() {
    let d3 = require('d3');

    /*
     * Adds div DOM elements to the `.x-axis-div-wrapper` element based on the data layout.
     * For example, if the data has rows, it returns the same number of
     * `.x-axis-div` elements as row objects.
     */

    return function (selection) {
      selection.each(function () {
        let div = d3.select(this);

        div.selectAll('.x-axis-div')
        .append('div')
        .data(function (d) {
          return d.columns ? d.columns : [d];
        })
        .enter()
          .append('div')
          .attr('class', 'x-axis-div');
      });
    };
  };
});
