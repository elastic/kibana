import expect from 'expect.js';
import { KibanaMap } from 'ui/vis_maps/kibana_map';

describe('kibana_map tests', function () {

  let domNode;
  let kibanaMap;

  function setupDOM() {
    domNode = document.createElement('div');
    domNode.style.top = '0';
    domNode.style.left = '0';
    domNode.style.width = '512px';
    domNode.style.height = '512px';
    domNode.style.position = 'fixed';
    domNode.style['pointer-events'] = 'none';
    document.body.appendChild(domNode);
  }

  function teardownDOM() {
    domNode.innerHTML = '';
    document.body.removeChild(domNode);
  }


  describe('KibanaMap - basics', function () {

    beforeEach(async function () {
      setupDOM();
      kibanaMap = new KibanaMap(domNode, {
        minZoom: 1,
        maxZoom: 10,
        center: [0,0],
        zoom: 0
      });
    });

    afterEach(function () {
      kibanaMap.destroy();
      teardownDOM();
    });

    it('should instantiate at zoom level 2', function () {
      const bounds = kibanaMap.getBounds();
      expect(bounds.bottom_right.lon).to.equal(90);
      expect(bounds.top_left.lon).to.equal(-90);
      expect(kibanaMap.getCenter().lon).to.equal(0);
      expect(kibanaMap.getCenter().lat).to.equal(0);
      expect(kibanaMap.getZoomLevel()).to.equal(2);
    });

    it('should resize to fit container', function () {

      kibanaMap.setZoomLevel(2);
      expect(kibanaMap.getCenter().lon).to.equal(0);
      expect(kibanaMap.getCenter().lat).to.equal(0);

      domNode.style.width = '1024px';
      domNode.style.height = '1024px';
      kibanaMap.resize();

      expect(kibanaMap.getCenter().lon).to.equal(0);
      expect(kibanaMap.getCenter().lat).to.equal(0);
      const bounds = kibanaMap.getBounds();
      expect(bounds.bottom_right.lon).to.equal(180);
      expect(bounds.top_left.lon).to.equal(-180);

    });

  });


  describe('KibanaMap - baseLayer', function () {

    beforeEach(async function () {
      setupDOM();
      kibanaMap = new KibanaMap(domNode, {
        minZoom: 1,
        maxZoom: 10,
        center: [0,0],
        zoom: 0
      });
    });

    afterEach(function () {
      kibanaMap.destroy();
      teardownDOM();
    });


    it('TMS', async function () {

      const options = {
        'url': 'https://tiles-stage.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana',
        'minZoom': 0,
        'maxZoom': 12,
        'attribution': '© [Elastic Tile Service](https://www.elastic.co/elastic-tile-service)'
      };


      return new Promise(function (resolve) {
        kibanaMap.on('baseLayer:loaded', () => {
          resolve();
        });
        kibanaMap.setBaseLayer({
          baseLayerType: 'tms',
          options: options
        });
      });
    });

    it('WMS', async function () {

      const options = {
        url: 'https://basemap.nationalmap.gov/arcgis/services/USGSTopo/ MapServer/WMSServer',
        version: '1.3.0',
        layers: '0',
        format: 'image/png',
        transparent: true,
        attribution: 'Maps provided by USGS',
        styles: '',
        minZoom: 1,
        maxZoom: 18
      };


      return new Promise(function (resolve) {
        kibanaMap.on('baseLayer:loaded', () => {
          resolve();
        });
        kibanaMap.setBaseLayer({
          baseLayerType: 'wms',
          options: options
        });
      });
    });

  });


});
