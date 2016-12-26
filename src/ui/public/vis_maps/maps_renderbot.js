import _ from 'lodash';
import MapsProvider from 'ui/vis_maps/maps';
import VisRenderbotProvider from 'ui/vis/renderbot';
import MapsVisTypeBuildChartDataProvider from 'ui/vislib_vis_type/build_chart_data';
module.exports = function MapsRenderbotFactory(Private, $injector) {
  const AngularPromise = $injector.get('Promise');
  const Maps = Private(MapsProvider);
  const Renderbot = Private(VisRenderbotProvider);
  const buildChartData = Private(MapsVisTypeBuildChartDataProvider);

  _.class(MapsRenderbot).inherits(Renderbot);
  function MapsRenderbot(vis, $el, uiState) {
    MapsRenderbot.Super.call(this, vis, $el, uiState);
    this._createVis();
  }

  MapsRenderbot.prototype._createVis = function () {
    if (this.mapsVis) this.destroy();
    this.mapsParams = this._getMapsParams();
    this.mapsVis = new Maps(this.$el[0], this.vis, this.mapsParams);

    _.each(this.vis.listeners, (listener, event) => {
      this.mapsVis.on(event, listener);
    });

    if (this.mapsData) {
      this.mapsVis.render(this.mapsData, this.uiState);
    }
  };

  MapsRenderbot.prototype._getMapsParams = function () {
    const self = this;

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

  MapsRenderbot.prototype.buildChartData = buildChartData;
  MapsRenderbot.prototype.render = function (esResponse) {
    this.mapsData = this.buildChartData(esResponse);
    return AngularPromise.delay(1).then(() => {
      this.mapsVis.render(this.mapsData, this.uiState);
    });
  };

  MapsRenderbot.prototype.destroy = function () {
    const self = this;

    const mapsVis = self.mapsVis;

    _.forOwn(self.vis.listeners, function (listener, event) {
      mapsVis.off(event, listener);
    });

    mapsVis.destroy();
  };

  MapsRenderbot.prototype.updateParams = function () {
    const self = this;

    // get full maps params object
    const newParams = self._getMapsParams();

    // if there's been a change, replace the vis
    if (!_.isEqual(newParams, self.mapsParams)) self._createVis();
  };

  return MapsRenderbot;
};
