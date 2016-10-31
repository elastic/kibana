import _ from 'lodash';
import d3 from 'd3';
export default function AxisConfigFactory() {

  const defaults = {
    show: true,
    type: 'value',
    elSelector: '.axis-wrapper-{pos} .axis-div',
    position: 'left',
    scale: {
      type: 'linear',
      expandLastBucket: true, //TODO: rename ... bucket has nothing to do with vis
      inverted: false,
      setYExtents: null,
      defaultYExtents: null,
      min: null,
      max: null,
      mode: 'normal' // [percentage, normal, wiggle, silluete]
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
      axisFormatter: null,
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
      filter: true,
      truncate: 0,
    }
  };

  const valueDefaults = {
    labels: {
      axisFormatter: d3.format('n')
    }
  };

  class AxisConfig {
    constructor(chartConfig, axisConfigArgs) {
      const typeDefaults = axisConfigArgs.type === 'category' ? categoryDefaults : valueDefaults;
      this._values = _.defaultsDeep({}, axisConfigArgs, typeDefaults, defaults);

      this._values.elSelector = this._values.elSelector.replace('{pos}', this._values.position);
      this._values.rootEl = chartConfig.get('el');

      this.data = chartConfig.data;
      if (this._values.type === 'category') {
        this.values = this.data.xValues();
        this.ordered = this.data.get('ordered');
        if (!this._values.labels.axisFormatter) {
          this._values.labels.axisFormatter = this.data.data.xAxisFormatter || this.data.get('xAxisFormatter');
        }
      }

      if (this._values.type === 'value') {
        const isWiggleOrSilluete = chartConfig.get('mode') === 'wiggle' || chartConfig.get('mode') === 'silluete';
        // if show was not explicitly set and wiggle or silluete option was checked
        if (!axisConfigArgs.show && isWiggleOrSilluete) {
          this._values.show = false;
        }

        // override axisFormatter (to replicate current behaviour)
        if (this.isPercentage()) {
          this._values.labels.axisFormatter = d3.format('%');
        }

        if (this.isLogScale()) {
          this._values.labels.filter = true;
        }
      }

      // horizontal axis with ordinal scale should have labels rotated (so we can fit more)
      // unless explicitly overriden by user
      if (this.isHorizontal() && this.isOrdinal()) {
        this._values.labels.filter = _.get(axisConfigArgs, 'labels.filter', false);
        this._values.labels.rotate = _.get(axisConfigArgs, 'labels.rotate', 70);
      }

      let offset;
      switch (this.get('scale.mode')) {
        case 'normal':
          offset = 'zero';
          break;
        case 'percentage':
          offset = 'expand';
          break;
        case 'grouped':
          offset = 'group';
          break;
        default:
          offset = this.get('scale.mode');
      }
      this.set('scale.offset', _.get(axisConfigArgs, 'scale.offset', offset));
    };

    get(property, defaults = null) {
      if (_.has(this._values, property)) {
        return _.get(this._values, property, defaults);
      } else {
        throw new Error(`Accessing invalid config property: ${property}`);
        return defaults;
      }
    };

    set(property, value) {
      return _.set(this._values, property, value);
    };

    isHorizontal() {
      return (this._values.position === 'top' || this._values.position === 'bottom');
    };

    isOrdinal() {
      return !!this.values && (!this.isTimeDomain());
    };

    isTimeDomain() {
      return this.ordered && this.ordered.date;
    };

    isPercentage() {
      return this._values.scale.mode === 'percentage';
    };

    isUserDefined() {
      return this._values.scale.setYExtents;
    };

    isYExtents() {
      return this._values.scale.defaultYExtents;
    };

    isLogScale() {
      return this.getScaleType() === 'log';
    };

    getScaleType() {
      return this._values.scale.type;
    };
  }

  return AxisConfig;
}
