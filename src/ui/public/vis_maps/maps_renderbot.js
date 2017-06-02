import $ from 'jquery';
import _ from 'lodash';
import { VisRenderbotProvider } from 'ui/vis/renderbot';
import { VislibVisTypeBuildChartDataProvider } from 'ui/vislib_vis_type/build_chart_data';
import { FilterBarPushFilterProvider } from 'ui/filter_bar/push_filter';
import { KibanaMap } from './kibana_map';
import { GeohashLayer } from './geohash_layer';
import './lib/service_settings';
import './styles/_tilemap.less';
import { ResizeCheckerProvider } from 'ui/resize_checker';


module.exports = function MapsRenderbotFactory(Private, $injector, serviceSettings, Notifier, courier, getAppState) {

  const ResizeChecker = Private(ResizeCheckerProvider);
  const Renderbot = Private(VisRenderbotProvider);
  const buildChartData = Private(VislibVisTypeBuildChartDataProvider);
  const notify = new Notifier({ location: 'Coordinate Map' });

  class MapsRenderbot extends Renderbot {

    constructor(vis, $el, uiState) {
      super(vis, $el, uiState);
      this._buildChartData = buildChartData.bind(this);
      this._geohashLayer = null;
      this._kibanaMap = null;
      this._$container = $el;
      this._kibanaMapReady = this._makeKibanaMap($el);
      this._baseLayerDirty = true;
      this._dataDirty = true;
      this._paramsDirty = true;
      this._resizeChecker = new ResizeChecker($el);
      this._resizeChecker.on('resize', () => {
        if (this._kibanaMap) {
          this._kibanaMap.resize();
        }
      });
    }

    async _makeKibanaMap() {

      try {
        this._tmsService = await serviceSettings.getTMSService();
        this._tmsError = null;
      } catch (e) {
        this._tmsService = null;
        this._tmsError = e;
        notify.warning(e.message);
      }

      if (this._kibanaMap) {
        this._kibanaMap.destroy();
      }

      const containerElement = $(this._$container)[0];
      const options = _.clone(this._getMinMaxZoom());
      const uiState = this.vis.getUiState();
      const zoomFromUiState = parseInt(uiState.get('mapZoom'));
      const centerFromUIState = uiState.get('mapCenter');
      options.zoom = !isNaN(zoomFromUiState) ? zoomFromUiState : this.vis.type.params.defaults.mapZoom;
      options.center = centerFromUIState ? centerFromUIState : this.vis.type.params.defaults.mapCenter;

      this._kibanaMap = new KibanaMap(containerElement, options);
      this._kibanaMap.addDrawControl();
      this._kibanaMap.addFitControl();
      this._kibanaMap.addLegendControl();
      this._kibanaMap.persistUiStateForVisualization(this.vis);

      let previousPrecision = this._kibanaMap.getAutoPrecision();
      let precisionChange = false;
      this._kibanaMap.on('zoomchange', () => {
        precisionChange = (previousPrecision !== this._kibanaMap.getAutoPrecision());
        previousPrecision = this._kibanaMap.getAutoPrecision();
      });
      this._kibanaMap.on('zoomend', () => {

        const isAutoPrecision = _.get(this._chartData, 'geohashGridAgg.params.autoPrecision', true);
        if (!isAutoPrecision) {
          return;
        }

        this._dataDirty = true;
        if (precisionChange) {
          courier.fetch();
        } else {
          this._recreateGeohashLayer();
          this._dataDirty = false;
          this._doRenderComplete();
        }
      });


      this._kibanaMap.on('drawCreated:rectangle', event => {
        addSpatialFilter(_.get(this._chartData, 'geohashGridAgg'), 'geo_bounding_box', event.bounds);
      });
      this._kibanaMap.on('baseLayer:loaded', () => {
        this._baseLayerDirty = false;
        this._doRenderComplete();
      });
      this._kibanaMap.on('baseLayer:loading', () => {
        this._baseLayerDirty = true;
      });
    }

    _getMinMaxZoom() {
      const mapParams = this._getMapsParams();
      if (this._tmsError) {
        return serviceSettings.getFallbackZoomSettings(mapParams.wms.enabled);
      } else {
        return this._tmsService.getMinMaxZoom(mapParams.wms.enabled);
      }
    }

    _recreateGeohashLayer() {
      if (this._geohashLayer) {
        this._kibanaMap.removeLayer(this._geohashLayer);
      }
      if (!this._geohashGeoJson) {
        return;
      }
      const geohashOptions = this._getGeohashOptions();
      this._geohashLayer = new GeohashLayer(this._chartData.geoJson, geohashOptions, this._kibanaMap.getZoomLevel(), this._kibanaMap);
      this._kibanaMap.addLayer(this._geohashLayer);
    }


    /**
     * called on data change
     * @param esResponse
     */
    render(esResponse) {
      this._dataDirty = true;
      this._kibanaMapReady.then(() => {
        this._chartData = this._buildChartData(esResponse);
        this._geohashGeoJson = this._chartData.geoJson;
        this._recreateGeohashLayer();
        this._kibanaMap.useUiStateFromVisualization(this.vis);
        this._kibanaMap.resize();
        this._dataDirty = false;
        this._doRenderComplete();
      });
    }

    destroy() {
      if (this._kibanaMap) {
        this._kibanaMap.destroy();
      }
    }

    /**
     * called on options change (vis.params change)
     */
    updateParams() {

      this._paramsDirty = true;
      this._kibanaMapReady.then(async() => {
        const mapParams = this._getMapsParams();
        const { minZoom, maxZoom } = this._getMinMaxZoom();

        if (mapParams.wms.enabled) {

          if (maxZoom > this._kibanaMap.getMaxZoomLevel()) {
            this._geohashLayer = null;
            this._kibanaMapReady = this._makeKibanaMap();
          }

          this._kibanaMap.setBaseLayer({
            baseLayerType: 'wms',
            options: {
              minZoom: minZoom,
              maxZoom: maxZoom,
              url: mapParams.wms.url,
              ...mapParams.wms.options
            }
          });
        } else {

          if (maxZoom < this._kibanaMap.getMaxZoomLevel()) {
            this._geohashLayer = null;
            this._kibanaMapReady = this._makeKibanaMap();
            this._kibanaMap.setZoomLevel(maxZoom);
          }

          if (!this._tmsError) {
            const url = this._tmsService.getUrl();
            const options = this._tmsService.getTMSOptions();
            this._kibanaMap.setBaseLayer({
              baseLayerType: 'tms',
              options: { url, ...options }
            });
          }
        }
        const geohashOptions = this._getGeohashOptions();
        if (!this._geohashLayer || !this._geohashLayer.isReusable(geohashOptions)) {
          this._recreateGeohashLayer();
        }

        this._kibanaMap.setDesaturateBaseLayer(mapParams.isDesaturated);
        this._kibanaMap.setShowTooltip(mapParams.addTooltip);
        this._kibanaMap.setLegendPosition(mapParams.legendPosition);

        this._kibanaMap.useUiStateFromVisualization(this.vis);
        this._kibanaMap.resize();
        this._paramsDirty = false;
        this._doRenderComplete();
      });
    }

    _getMapsParams() {
      return _.assign(
        {},
        this.vis.type.params.defaults,
        { type: this.vis.type.name },
        this.vis.params
      );
    }

    _getGeohashOptions() {
      const newParams = this._getMapsParams();
      return {
        valueFormatter: this._chartData ? this._chartData.valueFormatter : null,
        tooltipFormatter: this._chartData ? this._chartData.tooltipFormatter : null,
        mapType: newParams.mapType,
        heatmap: {
          heatBlur: newParams.heatBlur,
          heatMaxZoom: newParams.heatMaxZoom,
          heatMinOpacity: newParams.heatMinOpacity,
          heatRadius: newParams.heatRadius
        }
      };
    }

    _doRenderComplete() {
      if (this._paramsDirty || this._dataDirty || this._baseLayerDirty) {
        return;
      }
      this.$el.trigger('renderComplete');
    }

  }

  function addSpatialFilter(agg, filterName, filterData) {
    if (!agg) {
      return;
    }

    const indexPatternName = agg.vis.indexPattern.id;
    const field = agg.fieldName();
    const filter = {};
    filter[filterName] = { ignore_unmapped: true };
    filter[filterName][field] = filterData;

    const putFilter = Private(FilterBarPushFilterProvider)(getAppState());
    return putFilter(filter, false, indexPatternName);
  }


  return MapsRenderbot;
};
