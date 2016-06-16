import d3 from 'd3';
define(function () {
  return function YAxisSplitFactory() {

    /*
     * Adds div DOM elements to the `.y-axis-div-wrapper` element based on the data layout.
     * For example, if the data has rows, it returns the same number of
     * `.y-axis-div` elements as row objects.
     */

    // render and get bounding box width

    let YAxisSplit = function (divClass, isSecondary) {
      this.yAxisDivClass = divClass;
      this.isSecondary = isSecondary;
    };

    YAxisSplit.prototype.build = function () {
      let self = this;
      return function (selection, parent, opts) {
        let yAxis = self.isSecondary ?
                    opts && opts.secondaryYAxis :
                    opts && opts.yAxis;

        selection.each(function () {
          let div = d3.select(this);

          div.call(self.setWidth, yAxis);

          div.selectAll('.' + self.yAxisDivClass)
          .append('div')
          .data(function (d) {
            return d.rows ? d.rows : [d];
          })
          .enter()
          .append('div')
          .attr('class', self.yAxisDivClass);
        });
      };
    };

    YAxisSplit.prototype.setWidth = function (el, yAxis) {
      if (!(yAxis && yAxis.el)) return;

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
    };

    return YAxisSplit;
  };
});
