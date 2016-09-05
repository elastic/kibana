import d3 from 'd3';
import $ from 'jquery';
import _ from 'lodash';
import ErrorHandlerProvider from 'ui/vislib/lib/_error_handler';
export default function AxisTitleFactory(Private) {

  const ErrorHandler = Private(ErrorHandlerProvider);
  const defaults = {
    title: '',
    elSelector: '.axis-wrapper-{pos} .axis-title'
  };

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
    constructor(axis, attr) {
      super();
      _.extend(this, defaults, attr);
      this.axis = axis;
      this.elSelector = this.elSelector.replace('{pos}', axis.position);
    }

    /**
     * Renders both x and y axis titles
     *
     * @method render
     * @returns {HTMLElement} DOM Element with axis titles
     */
    render(selection) {
      d3.select(this.axis.vis.el).selectAll(this.elSelector).call(this.draw());
    };

    /**
     * Appends an SVG with title text
     *
     * @method draw
     * @param title {String} Axis title
     * @returns {Function} Appends axis title to a D3 selection
     */
    draw() {
      const self = this;

      return function (selection) {
        selection.each(function () {
          const el = this;
          const div = d3.select(el);
          const width = $(el).width();
          const height = $(el).height();

          self.validateWidthandHeight(width, height);

          const svg = div.append('svg')
          .attr('width', width)
          .attr('height', height);


          const bbox = svg.append('text')
          .attr('transform', function () {
            if (self.axis.isHorizontal()) {
              return 'translate(' + width / 2 + ',11)';
            }
            return 'translate(11,' + height / 2 + ') rotate(270)';
          })
          .attr('text-anchor', 'middle')
          .text(self.title)
          .node()
          .getBBox();

          if (self.axis.isHorizontal()) {
            svg.attr('height', bbox.height);
          } else {
            svg.attr('width', bbox.width);
          }
        });
      };
    };
  }
  return AxisTitle;
};
