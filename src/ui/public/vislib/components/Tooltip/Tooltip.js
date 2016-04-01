let d3 = require('d3');
let _ = require('lodash');
let $ = require('jquery');
let Binder = require('ui/Binder');
let positionTooltip = require('./positionTooltip');

let allContents = [];

/**
 * Add tooltip and listeners to visualization elements
 *
 * @class Tooltip
 * @constructor
 * @param el {HTMLElement} Reference to DOM element
 * @param formatter {Function} Tooltip formatter
 * @param events {Constructor} Allows tooltip to return event response data
 */
function Tooltip(id, el, formatter, events) {
  if (!(this instanceof Tooltip)) {
    return new Tooltip(id, el, formatter, events);
  }

  this.id = id; // unique id for this tooltip type
  this.el = el;
  this.order = 100; // higher ordered contents are rendered below the others
  this.formatter = formatter;
  this.events = events;
  this.containerClass = 'vis-wrapper';
  this.tooltipClass = 'vis-tooltip';
  this.tooltipSizerClass = 'vis-tooltip-sizing-clone';
  this.showCondition = _.constant(true);

  this.binder = new Binder();
}

/**
 * Get jquery reference to the tooltip node
 *
 * @return {Object} jQuery node object
 */
Tooltip.prototype.$get = _.once(function () {
  return $('<div>').addClass(this.tooltipClass).appendTo(document.body);
});

/**
 * Get jquery reference to the tooltip sizer node
 *
 * @return {Object} jQuery node object
 */
Tooltip.prototype.$getSizer = _.once(function () {
  return this.$get()
  .clone()
  .removeClass(this.tooltipClass)
  .addClass(this.tooltipSizerClass)
  .appendTo(document.body);
});

/**
 * Show the tooltip, positioning it based on the content and chart container
 */
Tooltip.prototype.show = function () {
  let $tooltip = this.$get();
  let $chart = this.$getChart();
  let html = $tooltip.html();

  if (!$chart) return;

  let placement = positionTooltip({
    $window: $(window),
    $chart: $chart,
    $el: $tooltip,
    $sizer: this.$getSizer(),
    event: d3.event
  }, html);

  $tooltip.css({
    visibility: 'visible',
    left: placement.left,
    top: placement.top
  });
};

/**
 * Hide the tooltip, clearing its contents
 */
Tooltip.prototype.hide = function () {
  let $tooltip = this.$get();
  allContents = [];
  $tooltip.css({
    visibility: 'hidden',
    left: '-500px',
    top: '-500px'
  });
};

/**
 * Get the jQuery chart node, based on the container object
 * NOTE: the container is a d3 selection
 *
 * @return {Object} jQuery node for the chart
 */
Tooltip.prototype.$getChart = function () {
  let chart = $(this.container && this.container.node());
  return chart.size() ? chart : false;
};

/**
 * Renders tooltip
 *
 * @method render
 * @return {Function} Renders tooltip on a D3 selection
 */
Tooltip.prototype.render = function () {
  let self = this;

  /**
   * Calculates values for the tooltip placement
   *
   * @param {Object} selection D3 selection object
   */
  return function (selection) {
    let $tooltip = self.$get();
    let id = self.id;
    let order = self.order;

    let tooltipSelection = d3.select($tooltip.get(0));

    if (self.container === undefined || self.container !== d3.select(self.el).select('.' + self.containerClass)) {
      self.container = d3.select(self.el).select('.' + self.containerClass);
    }

    let $chart = self.$getChart();
    if ($chart) {
      self.binder.jqOn($chart, 'mouseleave', function (event) {
        // only clear when we leave the chart, so that
        // moving between points doesn't make it reposition
        $chart.removeData('previousPlacement');
      });
    }

    selection.each(function (d, i) {
      let element = d3.select(this);

      function render(html) {
        allContents = _.filter(allContents, function (content) {
          return content.id !== id;
        });

        if (html) allContents.push({ id: id, html: html, order: order });

        let allHtml = _(allContents)
        .sortBy('order')
        .pluck('html')
        .compact()
        .join('\n');

        if (allHtml) {
          $tooltip.html(allHtml);
          self.show();
        } else {
          self.hide();
        }
      }

      self.binder.fakeD3Bind(this, 'mousemove', function () {
        if (!self.showCondition.call(element, d, i)) {
          return render();
        }

        let events = self.events ? self.events.eventResponse(d, i) : d;
        return render(self.formatter(events));
      });

      self.binder.fakeD3Bind(this, 'mouseleave', function () {
        render();
      });
    });
  };
};

Tooltip.prototype.destroy = function () {
  this.binder.destroy();
};

module.exports = function TooltipFactoryProvider() {
  return Tooltip;
};
