import d3 from 'd3';
import $ from 'jquery';
import VislibLibErrorHandlerProvider from 'ui/vislib/lib/_error_handler';
export default function AxisTitleFactory(Private) {

  const ErrorHandler = Private(VislibLibErrorHandlerProvider);

  /**
   * Appends axis title(s) to the visualization
   *
   * @class AxisTitle
   * @constructor
   * @param el {HTMLElement} DOM element
   * @param xTitle {String} X-axis title
   * @param yTitle {String} Y-axis title
   */
  class AxisTitle extends ErrorHandler {
    constructor(el, xTitle, yTitle) {
      super();
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
    render() {
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
    draw(title) {
      const self = this;

      return function (selection) {
        selection.each(function () {
          const el = this;
          const div = d3.select(el);
          const width = $(el).width();
          const height = $(el).height();

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
  }

  return AxisTitle;
};
