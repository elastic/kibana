import _ from 'lodash';
import d3 from 'd3';
import MapsConfigProvider from './lib/maps_config';
import TileMapChartProvider from './visualizations/tile_map';
import EventsProvider from 'ui/events';
import MapsDataProvider from './lib/data';
import LayoutProvider from './lib/layout';
import './styles/_tilemap.less';

export default function MapsFactory(Private) {
  const Events = Private(EventsProvider);
  const MapsConfig = Private(MapsConfigProvider);
  const TileMapChart = Private(TileMapChartProvider);
  const Data = Private(MapsDataProvider);
  const Layout = Private(LayoutProvider);

  class Maps extends Events {
    constructor($el, vis, mapsConfigArgs) {
      super(arguments);
      this.el = $el.get ? $el.get(0) : $el;
      this.vis = vis;
      this.mapsConfigArgs = mapsConfigArgs;

      // memoize so that the same function is returned every time,
      // allowing us to remove/re-add the same function
      this.getProxyHandler = _.memoize(function (event) {
        const self = this;
        return function (e) {
          self.emit(event, e);
        };
      });

      this.enable = this.chartEventProxyToggle('on');
      this.disable = this.chartEventProxyToggle('off');
    }

    chartEventProxyToggle(method) {
      return function (event, chart) {
        const proxyHandler = this.getProxyHandler(event);

        _.each(chart ? [chart] : this.charts, function (chart) {
          chart.events[method](event, proxyHandler);
        });
      };
    }

    on(event, listener) {
      const first = this.listenerCount(event) === 0;
      const ret = Events.prototype.on.call(this, event, listener);
      const added = this.listenerCount(event) > 0;

      // if this is the first listener added for the event
      // enable the event in the handler
      if (first && added && this.handler) this.handler.enable(event);

      return ret;
    }

    off(event, listener) {
      const last = this.listenerCount(event) === 1;
      const ret = Events.prototype.off.call(this, event, listener);
      const removed = this.listenerCount(event) === 0;

      // Once all listeners are removed, disable the events in the handler
      if (last && removed && this.handler) this.handler.disable(event);
      return ret;
    }

    render(data, uiState) {
      if (!data) {
        throw new Error('No valid data!');
      }

      this.uiState = uiState;
      this.data = new Data(data, this.uiState);
      this.visConfig = new MapsConfig(this.mapsConfigArgs, this.data, this.uiState);
      this.layout = new Layout(this.el, this.visConfig, this.data);
      this.draw();
    }

    destroy() {
      this.charts.forEach(chart => chart.destroy());
      d3.select(this.el).selectAll('*').remove();
    }

    draw() {
      this.layout.render();
      // todo: title
      const self = this;
      this.charts = [];
      d3.select(this.el).selectAll('.chart').each(function (chartData) {
        const chart = new TileMapChart(self, this, chartData);

        self.activeEvents().forEach(function (event) {
          self.enable(event, chart);
        });

        self.charts.push(chart);
        chart.render();
      });
    }

  }

  return Maps;
}
