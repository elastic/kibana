define(function (require) {
  require('ui/vislib/components/legend_value/legend_value.js');
  require('ui/vislib/components/legend_value/legend_value.less');

  return function LegendFactory(Private, $rootScope, $compile) {
    var d3 = require('d3');
    var $ = require('jquery');
    var _ = require('lodash');
    var Dispatch = Private(require('ui/vislib/lib/dispatch'));
    var Data = Private(require('ui/vislib/lib/data'));
    var legendHeaderTemplate = _.template(require('ui/vislib/partials/legend_header.html'));
    var dataLabel = require('ui/vislib/lib/_data_label');
    var color = Private(require('ui/vislib/components/color/color'));

    const NUM_COLORS = 5 * 5; // rows x columns
    const colorPalette = Private(require('ui/vislib/components/color/color_palette'))(NUM_COLORS);

    /**
     * Appends legend to the visualization
     *
     * @class Legend
     * @constructor
     * @param vis {Object} Reference to Vis Constructor
     */
    function Legend(vis) {
      if (!(this instanceof Legend)) {
        return new Legend(vis);
      }

      var data = vis.data.columns || vis.data.rows || [vis.data];
      var type = vis._attr.type;
      var labels = this.labels = this._getLabels(data, type);
      var labelsArray = labels.map(function (obj) { return obj.label; });

      this.events = new Dispatch();
      this.vis = vis;
      this.el = vis.el;
      this.color = color(labelsArray, vis.uiState.get('vis.colors'));
      this._attr = _.defaults({}, vis._attr || {}, {
        'legendClass' : 'legend-col-wrapper',
        'blurredOpacity' : 0.3,
        'focusOpacity' : 1,
        'defaultOpacity' : 1,
        'legendDefaultOpacity': 1
      });
    }

    Legend.prototype._getPieLabels = function (data) {
      return Data.prototype.pieNames(data);
    };

    Legend.prototype._getSeriesLabels = function (data) {
      var values = data.map(function (chart) {
        return chart.series;
      })
      .reduce(function (a, b) {
        return a.concat(b);
      }, []);

      return _.uniq(values, 'label');
    };

    Legend.prototype._getLabels = function (data, type) {
      if (type === 'pie') return this._getPieLabels(data);
      return this._getSeriesLabels(data);
    };

    /**
     * Adds legend header
     *
     * @method header
     * @param el {HTMLElement} Reference to DOM element
     * @param args {Object|*} Legend options
     * @returns {*} HTML element
     */
    Legend.prototype._header = function (el, args) {
      var self = this;
      return el.append('div')
      .attr('class', 'header')
      .append('div')
      .attr('class', 'column-labels')
      .html(function () {
        return legendHeaderTemplate({ isOpen: self.vis.get('legendOpen') });
      });
    };

    /**
     * Adds list to legend
     *
     * @method list
     * @param el {HTMLElement} Reference to DOM element
     * @param arrOfLabels {Array} Array of labels
     * @param args {Object|*} Legend options
     * @returns {D3.Selection} HTML element with list of labels attached
     */
    Legend.prototype._list = function (el, data, args) {
      var self = this;

      return el.append('ul')
      .attr('class', function () {
        var className = 'legend-ul';
        if (self.vis && !self.vis.get('legendOpen')) className += ' hidden';
        return className;
      })
      .selectAll('li')
      .data(data)
      .enter()
        .append('li')
        .classed('legend-value', true)
        .classed('color', true)
        .each(function (d) {
          var $scope = _.extend($rootScope.$new(), {
            visEl: self.el,
            color: args.color(d.label),
            legendData: d,
            uiState: self.vis.uiState
          });
          $compile(this)($scope);
        });
    };

    /**
     * Renders legend
     *
     * @method render
     * @return {HTMLElement} Legend
     */
    Legend.prototype.render = function () {
      var self = this;
      var visEl = d3.select(this.el);
      var legendDiv = visEl.select('.' + this._attr.legendClass);
      var items = this.labels;
      this._header(legendDiv, this);
      this._list(legendDiv, items, this);

      var headerIcon = visEl.select('.legend-toggle');

      // toggle legend open and closed
      headerIcon
      .on('click', function legendClick() {
        var legendOpen = !self.vis.get('legendOpen');
        self.vis.set('legendOpen', legendOpen);

        visEl.select('ul.legend-ul').classed('hidden', legendOpen);
        self.vis.resize();
      });

      legendDiv.selectAll('li.color').each(function (d) {
        var label = d.label;
        /*
        if (label !== undefined && label !== 'Count') {
          d3.select(this).call(self.events.addClickEvent());
        }
        */
      });
    };

    return Legend;
  };
});
