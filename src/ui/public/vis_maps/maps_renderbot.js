import $ from 'jquery';
import _ from 'lodash';
import VisRenderbotProvider from 'ui/vis/renderbot';
import MapsVisTypeBuildChartDataProvider from 'ui/vislib_vis_type/build_chart_data';
import FilterBarPushFilterProvider from 'ui/filter_bar/push_filter';
import KibanaMap from './kibana_map';
import GeohashLayer from './geohash_layer';
import './lib/tilemap_settings';
import './styles/_tilemap.less';
import { ResizeCheckerProvider } from 'ui/resize_checker';


module.exports = function MapsRenderbotFactory(Private, $injector, tilemapSettings, Notifier, courier, getAppState) {

  const ResizeChecker = Private(ResizeCheckerProvider);
  const Renderbot = Private(VisRenderbotProvider);
  const buildChartData = Private(MapsVisTypeBuildChartDataProvider);
  const notify = new Notifier({ location: 'Tilemap' });

  class MapsRenderbot extends Renderbot {

    constructor(vis, $el, uiState) {
      super(vis, $el, uiState);
      this._buildChartData = buildChartData.bind(this);
      this._geohashLayer = null;
      this._kibanaMap = null;
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

    async _makeKibanaMap($el) {

      if (!tilemapSettings.isInitialized()) {
        await tilemapSettings.loadSettings();
      }

      if (tilemapSettings.getError()) {
        //Still allow the visualization to be built, but show a toast that there was a problem retrieving map settings
        //Even though the basemap will not display, the user will at least still see the overlay data
        notify.warning(tilemapSettings.getError().message);
      }

      const containerElement = $($el)[0];
      const options = _.clone(tilemapSettings.getMinMaxZoom(false));
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
      this._kibanaMapReady.then(() => {
        const mapParams = this._getMapsParams();
        if (mapParams.wms.enabled) {
          const { minZoom, maxZoom } = tilemapSettings.getMinMaxZoom(true);
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
          if (!tilemapSettings.hasError()) {
            const url = tilemapSettings.getUrl();
            const options = tilemapSettings.getTMSOptions();
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
        {
          type: this.vis.type.name,
          hasTimeField: this.vis.indexPattern && this.vis.indexPattern.hasTimeField()// Add attribute which determines whether an index is time based or not.
        },
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
          heatNormalizeData: newParams.heatNormalizeData,
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
    filter[filterName] = {};
    filter[filterName][field] = filterData;

    const putFilter = Private(FilterBarPushFilterProvider)(getAppState());
    return putFilter(filter, false, indexPatternName);
  }


  return MapsRenderbot;
};


