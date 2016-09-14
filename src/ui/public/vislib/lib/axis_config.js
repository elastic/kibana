import _ from 'lodash';
export default function AxisConfigFactory() {

  const defaults = {
    show: true,
    type: 'value',
    elSelector: '.axis-wrapper-{pos} .axis-div',
    position: 'left',
    scale: {
      type: 'linear',
      expandLastBucket: true, //TODO: rename ... bucket has nothing to do with vis
      inverted: false
    },
    style: {
      color: '#ddd',
      lineWidth: '1px',
      opacity: 1,
      tickColor: '#ddd',
      tickWidth: '1px',
      tickLength: '6px'
    },
    labels: {
      axisFormatter: null, // TODO: create default axis formatter
      show: true,
      rotate: 0,
      rotateAnchor: 'center',
      filter: false,
      color: '#ddd',
      font: '"Open Sans", "Lato", "Helvetica Neue", Helvetica, Arial, sans-serif', // TODO
      fontSize: '8pt',
      truncate: 100
    },
    title: {
      text: '',
      elSelector: '.axis-wrapper-{pos} .axis-title'
    }
  };

  const categoryDefaults = {
    type: 'category',
    position: 'bottom',
    labels: {
      rotate: 0,
      rotateAnchor: 'end',
      filter: true
    }
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
  class AxisConfig {
    constructor(config) {
      if (config.type === 'category') {
        _.defaultsDeep(config, categoryDefaults);
      }
      _.defaultsDeep(config, defaults);
      _.extend(this, config);

      this.elSelector = this.elSelector.replace('{pos}', this.position);
      this.rootEl = this.vis.el;
    };

    get(property) {
      return _.get(this, property, null);
    };

    set(property, value) {
      return _.set(this, property, value);
    };

    isHorizontal() {
      return (this.position === 'top' || this.position === 'bottom');
    };

    isOrdinal() {
      return !!this.data.xValues() && (!this.isTimeDomain());
    };

    isTimeDomain() {
      return this.data.data.ordered && this.data.data.ordered.date;
    };

    isPercentage() {
      return (this.vis._attr.mode === 'percentage');
    };

    isUserDefined() {
      return (this.vis._attr.setYExtents);
    };

    isYExtents() {
      return (this.vis._attr.defaultYExtents);
    };

    isLogScale() {
      return this.getScaleType() === 'log';
    };

    getScaleType() {
      return this.vis._attr.scale;
    };
  }

  return AxisConfig;
}
