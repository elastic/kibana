import d3 from 'd3';
import $ from 'jquery';
import _ from 'lodash';
import VislibLibErrorHandlerProvider from 'ui/vislib/lib/_error_handler';
export default function AxisTitleFactory(Private) {

  var ErrorHandler = Private(VislibLibErrorHandlerProvider);

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
    var self = this;

    return function (selection) {
      selection.each(function () {
        var el = this;
        var div = d3.select(el);
        var width = $(el).width();
        var height = $(el).height();

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
