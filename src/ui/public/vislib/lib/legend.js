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

    Legend.prototype._colorPicker = function (el, label) {
      const self = this;

      const container = el.selectAll('div');
      if (!container.empty()) return container.remove();

      return el
      .append('div')
      .attr('class', 'color-selector')
      .selectAll('i').data(colorPalette)
      .enter()
        .append('i')
        .attr('class', 'fa fa-circle dots')
        .attr('style', function (d) {
          return `color: ${d};`;
        }).on('click', function (d) {
          const colors = self.vis.uiState.get('vis.colors') || {};
          colors[label] = d;
          self.vis.uiState.set('vis.colors', colors);
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
        .each(function (d) {
          var $scope = $rootScope.$new();
          $scope.legendData = d;
          $scope.color = args.color(d.label);
          $scope.visEl = self.el;


          $compile(this)($scope);

          var li = d3.select(this);
          dataLabel(this, d.label);

          /*
          li.append('i')
          .attr('class', 'fa fa-circle dots')
          .attr('style', 'color:' + args.color(d.label));

          li.append('span').text(d.label);
          */
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

      legendDiv.select('.legend-ul').selectAll('li')
      .on('mouseover', function (d) {
        return;
        var label = d.label;
        var charts = visEl.selectAll('.chart');

        function filterLabel() {
          var pointLabel = this.getAttribute('data-label');
          return pointLabel !== label.toString();
        }

        if (label && label !== 'Count') {
          d3.select(this).style('cursor', 'pointer');
        }

        // legend
        legendDiv.selectAll('li')
        .filter(filterLabel)
        .classed('blur_shape', true);

        // all data-label attribute
        charts.selectAll('[data-label]')
        .filter(filterLabel)
        .classed('blur_shape', true);

        var eventEl =  d3.select(this);
        eventEl.style('white-space', 'inherit');
        eventEl.style('word-break', 'break-all');
      })
      .on('mouseout', function () {
        return;
        /*
         * The default opacity of elements in charts may be modified by the
         * chart constructor, and so may differ from that of the legend
         */

        var charts = visEl.selectAll('.chart');

        // legend
        legendDiv.selectAll('li')
        .classed('blur_shape', false);

        // all data-label attribute
        charts.selectAll('[data-label]')
        .classed('blur_shape', false);

        var eventEl =  d3.select(this);
        eventEl.style('white-space', 'nowrap');
        eventEl.style('word-break', 'inherit');
      });

      legendDiv.selectAll('li.color').each(function (d) {
        d3.select(this).on('click', function (d) {
          self._colorPicker(d3.select(this), d.label);
        });
        //if (label !== undefined && label !== 'Count') {
        //  d3.select(this).call(self.events.addClickEvent());
        //}
      });
    };

    return Legend;
  };
});
