import d3 from 'd3';
import $ from 'jquery';
import _ from 'lodash';
import VislibLibErrorHandlerProvider from 'ui/vislib/lib/_error_handler';
import VislibComponentsTooltipProvider from 'ui/vislib/components/tooltip';
export default function ChartTitleFactory(Private) {

  var ErrorHandler = Private(VislibLibErrorHandlerProvider);
  var Tooltip = Private(VislibComponentsTooltipProvider);

  /**
   * Appends chart titles to the visualization
   *
   * @class ChartTitle
   * @constructor
   * @param el {HTMLElement} Reference to DOM element
   */
  _.class(ChartTitle).inherits(ErrorHandler);
  function ChartTitle(el) {
    if (!(this instanceof ChartTitle)) {
      return new ChartTitle(el);
    }

    this.el = el;
    this.tooltip = new Tooltip('chart-title', el, function (d) {
      return '<p>' + _.escape(d.label) + '</p>';
    });
  }

  /**
   * Renders chart titles
   *
   * @method render
   * @returns {D3.Selection|D3.Transition.Transition} DOM element with chart titles
   */
  ChartTitle.prototype.render = function () {
    var el = d3.select(this.el).select('.chart-title').node();
    var width = el ? el.clientWidth : 0;
    var height = el ? el.clientHeight : 0;

    return d3.select(this.el).selectAll('.chart-title').call(this.draw(width, height));
  };

  /**
   * Truncates chart title text
   *
   * @method truncate
   * @param size {Number} Height or width of the HTML Element
   * @returns {Function} Truncates text
   */
  ChartTitle.prototype.truncate = function (size) {
    var self = this;

    return function (selection) {
      selection.each(function () {
        var text = d3.select(this);
        var n = text[0].length;
        var maxWidth = size / n * 0.9;
        var length = this.getComputedTextLength();
        let str;
        let avg;
        let end;

        if (length > maxWidth) {
          str = text.text();
          avg = length / str.length;
          end = Math.floor(maxWidth / avg) - 5;
          str = str.substr(0, end) + '...';
          self.addMouseEvents(text);

          return text.text(str);
        }

        return text.text();
      });
    };
  };

  /**
   * Adds tooltip events on truncated chart titles
   *
   * @method addMouseEvents
   * @param target {HTMLElement} DOM element to attach event listeners
   * @returns {*} DOM element with event listeners attached
   */
  ChartTitle.prototype.addMouseEvents = function (target) {
    if (this.tooltip) {
      return target.call(this.tooltip.render());
    }
  };

  /**
   * Appends chart titles to the visualization
   *
   * @method draw
   * @returns {Function} Appends chart titles to a D3 selection
   */
  ChartTitle.prototype.draw = function (width, height) {
    var self = this;

    return function (selection) {
      selection.each(function () {
        var div = d3.select(this);
        var dataType = this.parentNode.__data__.rows ? 'rows' : 'columns';
        var size = dataType === 'rows' ? height : width;
        var txtHtOffset = 11;

        self.validateWidthandHeight(width, height);

        div.append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('text')
        .attr('transform', function () {
          if (dataType === 'rows') {
            return 'translate(' + txtHtOffset + ',' + height / 2 + ')rotate(270)';
          }
          return 'translate(' + width / 2 + ',' + txtHtOffset + ')';
        })
        .attr('text-anchor', 'middle')
        .text(function (d) { return d.label; });

        // truncate long chart titles
        div.selectAll('text')
        .call(self.truncate(size));
      });
    };
  };

  return ChartTitle;
};
