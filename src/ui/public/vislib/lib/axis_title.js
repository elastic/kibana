define(function (require) {
  return function AxisTitleFactory(Private) {
    let d3 = require('d3');
    let $ = require('jquery');
    let _ = require('lodash');

    let ErrorHandler = Private(require('ui/vislib/lib/_error_handler'));

    /**
     * Appends axis title(s) to the visualization
     *
     * @class AxisTitle
     * @constructor
     * @param el {HTMLElement} DOM element
     * @param xTitle {String} X-axis title
     * @param yTitle {String} Y-axis title
     */
    _.class(AxisTitle).inherits(ErrorHandler);
    function AxisTitle(el, xTitle, yTitle) {
      if (!(this instanceof AxisTitle)) {
        return new AxisTitle(el, xTitle, yTitle);
      }

      this.el = el;
      this.xTitle = xTitle;
      this.yTitle = yTitle;
    }

    /**
     * Renders both x and y axis titles
     *
     * @method render
     * @returns {HTMLElement} DOM Element with axis titles
     */
    AxisTitle.prototype.render = function () {
      d3.select(this.el).select('.x-axis-title').call(this.draw(this.xTitle));
      d3.select(this.el).select('.y-axis-title').call(this.draw(this.yTitle));
    };

    /**
     * Appends an SVG with title text
     *
     * @method draw
     * @param title {String} Axis title
     * @returns {Function} Appends axis title to a D3 selection
     */
    AxisTitle.prototype.draw = function (title) {
      let self = this;

      return function (selection) {
        selection.each(function () {
          let el = this;
          let div = d3.select(el);
          let width = $(el).width();
          let height = $(el).height();

          self.validateWidthandHeight(width, height);

          div.append('svg')
          .attr('width', width)
          .attr('height', height)
          .append('text')
          .attr('transform', function () {
            if (div.attr('class') === 'x-axis-title') {
              return 'translate(' + width / 2 + ',11)';
            }
            return 'translate(11,' + height / 2 + ')rotate(270)';
          })
          .attr('text-anchor', 'middle')
          .text(title);
        });
      };
    };

    return AxisTitle;
  };
});
