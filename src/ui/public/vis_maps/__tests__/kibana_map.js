import expect from 'expect.js';
import KibanaMap from 'ui/vis_maps/kibana_map';
// import KibanaMapLayer from 'ui/vis_maps/kibana_map_layer';
// import tilemapSettings from 'ui/vis_maps/lib/tilemap_settings';

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


  describe('KibanaMap', function () {

    beforeEach(async function () {
      setupDOM();
      kibanaMap = new KibanaMap(domNode, {
        minZoom: 1,
        maxZoom: 10
      });
    });

    afterEach(function () {
      kibanaMap.destroy();
      teardownDOM();
    });

    it('should instantiate with world in view', function () {
      expect(kibanaMap.isReady()).to.equal(true);
      const bounds = kibanaMap.getBounds();
      expect(bounds.bottom_right.lon).to.equal(180);
      expect(bounds.top_left.lon).to.equal(-180);
      expect(kibanaMap.getCenter().lon).to.equal(0);
      expect(kibanaMap.getCenter().lat).to.equal(0);
      expect(kibanaMap.getZoomLevel()).to.equal(1);
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


  // describe('with loaded settings', function () {
  //
  //   beforeEach(async function () {
  //     await tilemapSettings.loadSettings();
  //   });
  //
  //
  //   it('should do this right', function () {
  //     console.log('gargh!');
  //   });
  //
  // });


});
