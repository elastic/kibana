import _ from 'lodash';
import VislibProvider from 'ui/vislib';
import VisRenderbotProvider from 'ui/vis/renderbot';
import VislibVisTypeBuildChartDataProvider from 'ui/vislib_vis_type/build_chart_data';
module.exports = function VislibRenderbotFactory(Private, $injector) {
  const AngularPromise = $injector.get('Promise');
  let vislib = Private(VislibProvider);
  let Renderbot = Private(VisRenderbotProvider);
  let buildChartData = Private(VislibVisTypeBuildChartDataProvider);

  _.class(VislibRenderbot).inherits(Renderbot);
  function VislibRenderbot(vis, $el, uiState) {
    VislibRenderbot.Super.call(this, vis, $el, uiState);
    this._createVis();
  }

  VislibRenderbot.prototype._createVis = function () {
    if (this.vislibVis) this.destroy();

    this.vislibParams = this._getVislibParams();
    this.vislibVis = new vislib.Vis(this.$el[0], this.vislibParams);

    _.each(this.vis.listeners, (listener, event) => {
      this.vislibVis.on(event, listener);
    });

    this.vislibVis.on('renderComplete', () => {
      this.vis.emit('renderComplete');
    });

    if (this.chartData) {
      this.vislibVis.render(this.chartData, this.uiState);
    }
  };

  VislibRenderbot.prototype._getVislibParams = function () {
    let self = this;

    return _.assign(
      {},
      self.vis.type.params.defaults,
      {
        type: self.vis.type.name,
        // Add attribute which determines whether an index is time based or not.
        hasTimeField: self.vis.indexPattern && self.vis.indexPattern.hasTimeField()
      },
      self.vis.params
    );
  };

  VislibRenderbot.prototype.buildChartData = buildChartData;
  VislibRenderbot.prototype.render = function (esResponse) {
    this.chartData = this.buildChartData(esResponse);
    return AngularPromise.delay(1).then(() => {
      this.vislibVis.render(this.chartData, this.uiState);
    });
  };

  VislibRenderbot.prototype.destroy = function () {
    let self = this;

    let vislibVis = self.vislibVis;

    _.forOwn(self.vis.listeners, function (listener, event) {
      vislibVis.off(event, listener);
    });

    vislibVis.destroy();
  };

  VislibRenderbot.prototype.updateParams = function () {
    let self = this;

    // get full vislib params object
    let newParams = self._getVislibParams();

    // if there's been a change, replace the vis
    if (!_.isEqual(newParams, self.vislibParams)) self._createVis();
  };

  return VislibRenderbot;
};
