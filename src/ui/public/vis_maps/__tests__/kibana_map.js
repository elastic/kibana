import expect from 'expect.js';
import KibanaMap from 'ui/vis_maps/kibana_map';

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


  describe('should use the latest state before notifying (when modifying options multiple times)', function () {

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

    it('instantiation', function () {
      //should fit to the world on startup
      const bounds = kibanaMap.getBounds();
      expect(bounds.bottom_right.lon).to.equal(180);
      expect(bounds.top_left.lon).to.equal(-180);
    });

  });


});
