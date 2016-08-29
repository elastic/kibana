import d3 from 'd3';
import $ from 'jquery';
import _ from 'lodash';
import VislibLibErrorHandlerProvider from 'ui/vislib/lib/_error_handler';
export default function AxisTitleFactory(Private) {

  const ErrorHandler = Private(VislibLibErrorHandlerProvider);
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
  _.class(AxisTitle).inherits(ErrorHandler);
  function AxisTitle(axis, attr) {
    if (!(this instanceof AxisTitle)) {
      return new AxisTitle(axis, attr);
    }

    _.extend(this, defaults, attr);
    this.el = axis.vis.el;
    this.data = axis.data;
    this.elSelector = this.elSelector.replace('{pos}', axis.position);
  }

  /**
   * Renders both x and y axis titles
   *
   * @method render
   * @returns {HTMLElement} DOM Element with axis titles
   */
  AxisTitle.prototype.render = function (selection) {
    d3.select(this.el).selectAll(this.elSelector).call(this.draw());
  };

  /**
   * Appends an SVG with title text
   *
   * @method draw
   * @param title {String} Axis title
   * @returns {Function} Appends axis title to a D3 selection
   */
  AxisTitle.prototype.draw = function () {
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
          return 'translate(11,' + height / 2 + ') rotate(270)';
        })
        .attr('text-anchor', 'middle')
        .text(this.title);
      });
    };
  };

  return AxisTitle;
};
