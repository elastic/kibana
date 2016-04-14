define(function () {
  return function YAxisSplitFactory() {
    let d3 = require('d3');

    /*
     * Adds div DOM elements to the `.y-axis-div-wrapper` element based on the data layout.
     * For example, if the data has rows, it returns the same number of
     * `.y-axis-div` elements as row objects.
     */

    // render and get bounding box width
    return function (selection, parent, opts) {
      let yAxis = opts && opts.yAxis;

      selection.each(function () {
        let div = d3.select(this);

        div.call(setWidth, yAxis);

        div.selectAll('.y-axis-div')
        .append('div')
        .data(function (d) {
          return d.rows ? d.rows : [d];
        })
        .enter()
          .append('div')
          .attr('class', 'y-axis-div');
      });
    };

    function setWidth(el, yAxis) {
      if (!yAxis) return;

      let padding = 5;
      let height = parseInt(el.node().clientHeight, 10);

      // render svg and get the width of the bounding box
      let svg = d3.select('body')
      .append('svg')
      .attr('style', 'position:absolute; top:-10000; left:-10000');
      let width = svg.append('g')
      .call(yAxis.getYAxis(height)).node().getBBox().width + padding;
      svg.remove();

      el.style('width', (width + padding) + 'px');
    }
  };
});
