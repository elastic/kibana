import d3 from 'd3';
import _ from 'lodash';
import { Binder } from 'ui/binder';
import { positionTooltip } from './position_tooltip';
import $ from 'jquery';

/**
 * Add tooltip and listeners to visualization elements
 *
 * All Tooltip instances populate a shared div element
 * Each Tooltip instance with unique id manages a content container within the shared div element
 *
 * @class Tooltip
 * @constructor
 * @param el {HTMLElement} Reference to DOM element
 * @param formatter {Function} Tooltip formatter
 * @param events {Constructor} Allows tooltip to return event response data
 * @param options {Object} Tooltip options
 */
export function Tooltip(id, el, formatter, events, options = {}) {
  if (!(this instanceof Tooltip)) {
    return new Tooltip(id, el, formatter, events, options);
  }

  this.id = id; // unique id for this tooltip type
  this.el = el;
  this.formatter = formatter;
  this.events = events;
  this.containerClass = 'vis-wrapper';
  this.tooltipClass = 'vis-tooltip';
  this.tooltipSizerClass = 'vis-tooltip-sizing-clone';
  this.order = _.get(options, 'order', 100); // higher ordered contents are rendered below the others
  this.showCondition = _.get(options, 'showCondition', _.constant(true));
  this.updateContentOnMove = _.get(options, 'updateContentOnMove', false);
  this.contentContainer = this.getContentContainer();
  this.enterCount = 0;

  this.binder = new Binder();
}

/**
 * Get content container for Tooltip.
 * Tooltips with the same id share a content container.
 */
Tooltip.prototype.getContentContainer = function () {
  const $tooltip = this.$get();
  const containerId = `vis-tooltip-container-${this.id}`;
  const $container = $tooltip.find(`#${containerId}`);
  if($container.length === 0) {
    const contentContainer = $('<div>').attr('id', containerId).attr('data-order', this.order);
    $tooltip.append(contentContainer);
    $tooltip.children('div')
    .sort((a, b) => {
      return parseInt(a.getAttribute('data-order'), 10) - parseInt(b.getAttribute('data-order'), 10);
    })
    .detach().appendTo($tooltip);
    return contentContainer;
  }
  return $container;
};

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
  const $tooltip = this.$get();
  const $chart = this.$getChart();
  const html = $tooltip.html();

  if (!$chart) return;

  const placement = positionTooltip({
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
  const $tooltip = this.$get();
  $tooltip.css({
    visibility: 'hidden',
    left: '-500px',
    top: '-500px',
    width: '',
    height: ''
  });
};

/**
 * Get the jQuery chart node, based on the container object
 * NOTE: the container is a d3 selection
 *
 * @return {Object} jQuery node for the chart
 */
Tooltip.prototype.$getChart = function () {
  const chart = $(this.container && this.container.node());
  return chart.size() ? chart : false;
};

/**
 * Renders tooltip
 *
 * @method render
 * @return {Function} Renders tooltip on a D3 selection
 */
Tooltip.prototype.render = function () {
  const self = this;

  const mouseEnter = _.debounce(function (d3Event, d, i) {
    if (self.enterCount === 0) {
      return;
    }
    const currentD3Event = d3.event;
    d3.event = d3Event;
    if (!self.showCondition(d, i)) {
      self.contentContainer.empty();
    } else {
      const events = self.events ? self.events.eventResponse(d, i) : d;
      self.contentContainer.html(self.formatter(events));
      self.contentContainer.show();
      self.show();
    }
    d3.event = currentD3Event;
  }, 100);

  const mouseMove = _.debounce(function (d3Event, d, i) {
    if (self.enterCount === 0) {
      return;
    }
    const currentD3Event = d3.event;
    d3.event = d3Event;
    if (!self.showCondition(d, i)) {
      self.contentContainer.hide();
    } else {
      if (self.updateContentOnMove) {
        const events = self.events ? self.events.eventResponse(d, i) : d;
        self.contentContainer.html(self.formatter(events));
      }
      self.contentContainer.show();
      self.show();
    }
    d3.event = currentD3Event;
  }, 100);

  /**
   * Calculates values for the tooltip placement
   *
   * @param {Object} selection D3 selection object
   */
  return function (selection) {
    if (self.container === undefined || self.container !== d3.select(self.el).select('.' + self.containerClass)) {
      self.container = d3.select(self.el).select('.' + self.containerClass);
    }

    const $chart = self.$getChart();
    if ($chart) {
      self.binder.jqOn($chart, 'mouseleave', function () {
        // only clear when we leave the chart, so that
        // moving between points doesn't make it reposition
        $chart.removeData('previousPlacement');
      });
    }

    selection.each(function (d, i) {
      self.binder.fakeD3Bind(this, 'mouseenter', function () {
        const d3Event = d3.event; //preserve latest d3.event for when event handler is executed
        self.enterCount++;
        mouseEnter(d3Event, d, i);
      });

      self.binder.fakeD3Bind(this, 'mousemove', function () {
        const d3Event = d3.event; //preserve latest d3.event for when event handler is executed
        mouseMove(d3Event, d, i);
      });

      self.binder.fakeD3Bind(this, 'mouseleave', function () {
        if (self.enterCount > 0) {
          self.enterCount--;
        }
        self.contentContainer.empty();
        self.hide();
        if (_.has(self, 'formatter.cleanUp')) {
          self.formatter.cleanUp();
        }
      });
    });
  };
};

Tooltip.prototype.destroy = function () {
  this.contentContainer.remove();
  this.hide();
  this.binder.destroy();
};
