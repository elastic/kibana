import d3 from 'd3';
import $ from 'jquery';
import _ from 'lodash';
import VislibLibErrorHandlerProvider from 'ui/vislib/lib/_error_handler';
export default function AxisLabelsFactory(Private) {

  const ErrorHandler = Private(VislibLibErrorHandlerProvider);
  const defaults = {
    show: true,
    rotate: 0,
    rotateAnchor: 'center',
    filter: false,
    color: 'black',
    font: '"Open Sans", "Lato", "Helvetica Neue", Helvetica, Arial, sans-serif', // TODO
    fontSize: '8pt',
    truncate: 100
  };

  /**
   * Appends axis title(s) to the visualization
   *
   * @class AxisLabels
   * @constructor
   * @param el {HTMLElement} DOM element
   * @param xTitle {String} X-axis title
   * @param yTitle {String} Y-axis title
   */
  _.class(AxisLabels).inherits(ErrorHandler);
  function AxisLabels(axis, attr) {
    if (!(this instanceof AxisLabels)) {
      return new AxisLabels(axis, attr);
    }

    _.extend(this, defaults, attr);
    this.axis = axis;

    // horizontal axis with ordinal scale should have labels rotated (so we can fit more)
    if (this.axis.isHorizontal() && this.axis.scale.isOrdinal()) {
      this.filter = attr && attr.filter ? attr.filter : false;
      this.rotate = attr && attr.rotate ? attr.rotate : 70;
    }
  }

  /**
   * Renders both x and y axis titles
   *
   * @method render
   * @returns {HTMLElement} DOM Element with axis titles
   */
  AxisLabels.prototype.render = function (selection) {
    selection.call(this.draw());
  };

  /**
   * Rotate the axis tick labels within selection
   *
   * @returns {Function} Rotates x axis tick labels of a D3 selection
   */
  AxisLabels.prototype.rotateAxisLabels = function () {
    const self = this;
    return function (selection) {
      const text = selection.selectAll('.tick text');

      if (self.rotate) {
        text
          .style('text-anchor', function () {
            return self.rotateAnchor === 'center' ? 'center' : 'end';
          })
          .attr('dy', function () {
            if (self.axis.isHorizontal()) {
              if (self.axis.position === 'top') return '-0.9em';
              else return '0.3em';
            }
            return '0';
          })
          .attr('dx', function () {
            return self.axis.isHorizontal() ? '-0.9em' : '0';
          })
          .attr('transform', function rotate(d, j) {
            if (self.rotateAnchor === 'center') {
              const coord = text[0][j].getBBox();
              const transX =  ((coord.x) + (coord.width / 2));
              const transY =  ((coord.y) + (coord.height / 2));
              return `rotate(${self.rotate}, ${transX}, ${transY})`;
            } else {
              const rotateDeg = self.axis.position === 'top' ? self.rotate : -self.rotate;
              return `rotate(${rotateDeg})`;
            }
          });
      }
    };
  };

  /**
   * Returns a string that is truncated to fit size
   *
   * @method truncateLabel
   * @param text {HTMLElement}
   * @param size {Number}
   * @returns {*|jQuery}
   */
  AxisLabels.prototype.truncateLabel = function (text, size) {
    const node = d3.select(text).node();
    let str = $(node).text();
    const width = node.getBBox().width;
    const chars = str.length;
    const pxPerChar = width / chars;
    let endChar = 0;
    const ellipsesPad = 4;

    if (width > size) {
      endChar = Math.floor((size / pxPerChar) - ellipsesPad);
      while (str[endChar - 1] === ' ' || str[endChar - 1] === '-' || str[endChar - 1] === ',') {
        endChar = endChar - 1;
      }
      str = str.substr(0, endChar) + '...';
    }
    return str;
  };

  AxisLabels.prototype.truncateLabels = function () {
    const self = this;
    return function (selection) {
      selection.selectAll('.tick text')
        .text(function () {
          // TODO: add title to trancuated labels
          return self.truncateLabel(this, self.truncate);
        });
    };
  };

  /**
   * Filter out text labels by width and position on axis
   * trims labels that would overlap each other
   * or extend past left or right edges
   * if prev label pos (or 0) + half of label width is < label pos
   * and label pos + half width  is not > width of axis
   *
   * @method filterAxisLabels
   * @returns {Function}
   */
  AxisLabels.prototype.filterAxisLabels = function () {
    const self = this;
    let startX = 0;
    let maxW;
    let par;
    let myX;
    let myWidth;
    let halfWidth;
    let padding = 1.1;

    return function (selection) {
      if (!self.filter) return;

      selection.selectAll('.tick text')
        .text(function (d) {
          par = d3.select(this.parentNode).node();
          myX = self.axis.scale.scale(d);
          myWidth = par.getBBox().width * padding;
          halfWidth = myWidth / 2;
          maxW = $(self.axis.vis.el).find(self.axis.elSelector).width();

          if ((startX + halfWidth) < myX && maxW > (myX + halfWidth)) {
            startX = myX + halfWidth;
            return self.axis.axisFormatter(d);
          } else {
            d3.select(this.parentNode).remove();
          }
        });
    };
  };

  /**
   * Appends an SVG with title text
   *
   * @method draw
   * @param title {String} Axis title
   * @returns {Function} Appends axis title to a D3 selection
   */
  AxisLabels.prototype.draw = function () {
    const self = this;

    return function (selection) {
      selection.each(function () {
        selection.selectAll('text')
          .attr('style', function () {
            const currentStyle = d3.select(this).attr('style');
            return `${currentStyle} font-size: ${self.fontSize};`;
          });
        //.attr('x', -3 - parseInt(self.style.lineWidth) / 2 - parseInt(self.style.tickLength));
        if (!self.show) selection.selectAll('test').attr('style', 'display: none;');

        selection.call(self.truncateLabels());
        selection.call(self.rotateAxisLabels());
        selection.call(self.filterAxisLabels());
      });
    };
  };

  return AxisLabels;
};
