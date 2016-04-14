module.exports = function VislibRenderbotFactory(Private) {
  let _ = require('lodash');
  let vislib = Private(require('ui/vislib'));
  let Renderbot = Private(require('ui/Vis/Renderbot'));
  let buildChartData = Private(require('ui/vislib_vis_type/buildChartData'));

  _.class(VislibRenderbot).inherits(Renderbot);
  function VislibRenderbot(vis, $el, uiState) {
    VislibRenderbot.Super.call(this, vis, $el, uiState);
    this._createVis();
  }

  VislibRenderbot.prototype._createVis = function () {
    let self = this;

    if (self.vislibVis) self.destroy();

    self.vislibParams = self._getVislibParams();
    self.vislibVis = new vislib.Vis(self.$el[0], self.vislibParams);

    _.each(self.vis.listeners, function (listener, event) {
      self.vislibVis.on(event, listener);
    });

    if (this.chartData) self.vislibVis.render(this.chartData, this.uiState);
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
    this.vislibVis.render(this.chartData, this.uiState);
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
