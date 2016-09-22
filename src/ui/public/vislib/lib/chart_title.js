import d3 from 'd3';
import _ from 'lodash';
import VislibLibErrorHandlerProvider from 'ui/vislib/lib/_error_handler';
import VislibComponentsTooltipProvider from 'ui/vislib/components/tooltip';
export default function ChartTitleFactory(Private) {

  const ErrorHandler = Private(VislibLibErrorHandlerProvider);
  const Tooltip = Private(VislibComponentsTooltipProvider);

  /**
   * Appends chart titles to the visualization
   *
   * @class ChartTitle
   * @constructor
   * @param el {HTMLElement} Reference to DOM element
   */
  class ChartTitle extends ErrorHandler {
    constructor(el) {
      super();
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
    render() {
      const el = d3.select(this.el).select('.chart-title').node();
      const width = el ? el.clientWidth : 0;
      const height = el ? el.clientHeight : 0;

      return d3.select(this.el).selectAll('.chart-title').call(this.draw(width, height));
    };

    /**
     * Truncates chart title text
     *
     * @method truncate
     * @param size {Number} Height or width of the HTML Element
     * @returns {Function} Truncates text
     */
    truncate(size) {
      const self = this;

      return function (selection) {
        selection.each(function () {
          const text = d3.select(this);
          const n = text[0].length;
          const maxWidth = size / n * 0.9;
          const length = this.getComputedTextLength();
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
    addMouseEvents(target) {
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
    draw(width, height) {
      const self = this;

      return function (selection) {
        selection.each(function () {
          const div = d3.select(this);
          const dataType = this.parentNode.__data__.rows ? 'rows' : 'columns';
          const size = dataType === 'rows' ? height : width;
          const txtHtOffset = 11;

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
          .text(function (d) {
            return d.label;
          });

          // truncate long chart titles
          div.selectAll('text')
            .call(self.truncate(size));
        });
      };
    };
  }

  return ChartTitle;
};
