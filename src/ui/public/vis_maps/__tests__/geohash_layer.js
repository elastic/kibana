import expect from 'expect.js';
import { KibanaMap } from 'ui/vis_maps/kibana_map';
import { GeohashLayer } from 'ui/vis_maps/geohash_layer';
import { GeoHashSampleData } from './geohash_sample_data';

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


  describe('GeohashGridLayer', function () {

    beforeEach(async function () {
      setupDOM();
      kibanaMap = new KibanaMap(domNode, {
        minZoom: 1,
        maxZoom: 10
      });
      kibanaMap.setZoomLevel(3);
      kibanaMap.setCenter({
        lon: -100,
        lat: 40
      });
    });

    afterEach(function () {
      kibanaMap.destroy();
      teardownDOM();
    });

    [
      {
        options:  { 'mapType': 'Scaled Circle Markers' },
        expected: `[
	{
		"fill": "#bd0026",
		"d": "M343,263.8A19.2,19.2,0,1,1,342.9,263.8 z"
	},
	{
		"fill": "#bd0026",
		"d": "M343,225.03843394373595A18.961566056264047,18.961566056264047,0,1,1,342.9,225.03843394373595 z"
	},
	{
		"fill": "#bd0026",
		"d": "M283,264.19815701843777A17.80184298156226,17.80184298156226,0,1,1,282.9,264.19815701843777 z"
	},
	{
		"fill": "#f03b20",
		"d": "M405,224.2748797495895A16.72512025041049,16.72512025041049,0,1,1,404.9,224.2748797495895 z"
	},
	{
		"fill": "#f03b20",
		"d": "M285,223.50180417608374A16.498195823916255,16.498195823916255,0,1,1,284.9,223.50180417608374 z"
	},
	{
		"fill": "#f03b20",
		"d": "M343,299.1036928470748A15.896307152925205,15.896307152925205,0,1,1,342.9,299.1036928470748 z"
	},
	{
		"fill": "#f03b20",
		"d": "M283,300.2846189453604A15.71538105463958,15.71538105463958,0,1,1,282.9,300.2846189453604 z"
	},
	{
		"fill": "#fd8d3c",
		"d": "M148,267.0272116156895A13.972788384310489,13.972788384310489,0,1,1,147.9,267.0272116156895 z"
	},
	{
		"fill": "#feb24c",
		"d": "M219,270.4178825645856A11.582117435414355,11.582117435414355,0,1,1,218.9,270.4178825645856 z"
	},
	{
		"fill": "#feb24c",
		"d": "M146,189.63311915018554A11.366880849814459,11.366880849814459,0,1,1,145.9,189.63311915018554 z"
	},
	{
		"fill": "#feb24c",
		"d": "M281,191.96973262756177A11.030267372438226,11.030267372438226,0,1,1,280.9,191.96973262756177 z"
	},
	{
		"fill": "#feb24c",
		"d": "M220,231.85362974571228A10.146370254287714,10.146370254287714,0,1,1,219.9,231.85362974571228 z"
	},
	{
		"fill": "#feb24c",
		"d": "M144,231.1923722152369A9.807627784763092,9.807627784763092,0,1,1,143.9,231.1923722152369 z"
	},
	{
		"fill": "#feb24c",
		"d": "M387,268.27221854599287A9.72778145400714,9.72778145400714,0,1,1,386.9,268.27221854599287 z"
	},
	{
		"fill": "#feb24c",
		"d": "M217,191.09542834646925A8.90457165353074,8.90457165353074,0,1,1,216.9,191.09542834646925 z"
	},
	{
		"fill": "#fed976",
		"d": "M218,300.40744573968243A8.592554260317598,8.592554260317598,0,1,1,217.9,300.40744573968243 z"
	},
	{
		"fill": "#fed976",
		"d": "M363,339.5411821762003A7.458817823799684,7.458817823799684,0,1,1,362.9,339.5411821762003 z"
	},
	{
		"fill": "#fed976",
		"d": "M331,205.43072931381437A6.569270686185644,6.569270686185644,0,1,1,330.9,205.43072931381437 z"
	},
	{
		"fill": "#fed976",
		"d": "M163,299.9012571034098A5.098742896590189,5.098742896590189,0,1,1,162.9,299.9012571034098 z"
	},
	{
		"fill": "#fed976",
		"d": "M34,77.6735731867532A4.326426813246795,4.326426813246795,0,1,1,33.9,77.6735731867532 z"
	},
	{
		"fill": "#fed976",
		"d": "M268,341.7954688958982A4.204531104101819,4.204531104101819,0,1,1,267.9,341.7954688958982 z"
	},
	{
		"fill": "#fed976",
		"d": "M71,118.82649906983305A4.173500930166947,4.173500930166947,0,1,1,70.9,118.82649906983305 z"
	},
	{
		"fill": "#fed976",
		"d": "M119,235.1169130974434A3.8830869025566206,3.8830869025566206,0,1,1,118.9,235.1169130974434 z"
	},
	{
		"fill": "#fed976",
		"d": "M451,396.15053353027315A3.849466469726874,3.849466469726874,0,1,1,450.9,396.15053353027315 z"
	},
	{
		"fill": "#fed976",
		"d": "M64,104.18445019554242A3.815549804457569,3.815549804457569,0,1,1,63.9,104.18445019554242 z"
	},
	{
		"fill": "#fed976",
		"d": "M7,15.430879972386867A3.5691200276131325,3.5691200276131325,0,1,1,6.9,15.430879972386867 z"
	},
	{
		"fill": "#fed976",
		"d": "M434,206.8985557756997A3.1014442243003013,3.1014442243003013,0,1,1,433.9,206.8985557756997 z"
	},
	{
		"fill": "#fed976",
		"d": "M119,201.2073035006183A2.792696499381677,2.792696499381677,0,1,1,118.9,201.2073035006183 z"
	},
	{
		"fill": "#fed976",
		"d": "M-1,420.89773444794906A2.1022655520509095,2.1022655520509095,0,1,1,-1.1,420.89773444794906 z"
	},
	{
		"fill": "#fed976",
		"d": "M443,217.859886428343A1.1401135716569843,1.1401135716569843,0,1,1,442.9,217.859886428343 z"
	},
	{
		"fill": "#fed976",
		"d": "M121,260.85988642834303A1.1401135716569843,1.1401135716569843,0,1,1,120.9,260.85988642834303 z"
	},
	{
		"fill": "#fed976",
		"d": "M-4,399.27892886445886A0.7210711355411324,0.7210711355411324,0,1,1,-4.1,399.27892886445886 z"
	}
]`
      },
      {
        options: { 'mapType': 'Shaded Circle Markers' },
        expected: `[
	{
		"fill": "#bd0026",
		"d": "M343,267A16,16,0,1,1,342.9,267 z"
	},
	{
		"fill": "#bd0026",
		"d": "M343,226A18,18,0,1,1,342.9,226 z"
	},
	{
		"fill": "#bd0026",
		"d": "M283,266A16,16,0,1,1,282.9,266 z"
	},
	{
		"fill": "#f03b20",
		"d": "M405,223A18,18,0,1,1,404.9,223 z"
	},
	{
		"fill": "#f03b20",
		"d": "M285,222A18,18,0,1,1,284.9,222 z"
	},
	{
		"fill": "#f03b20",
		"d": "M343,300A15,15,0,1,1,342.9,300 z"
	},
	{
		"fill": "#f03b20",
		"d": "M283,301A15,15,0,1,1,282.9,301 z"
	},
	{
		"fill": "#fd8d3c",
		"d": "M148,265A16,16,0,1,1,147.9,265 z"
	},
	{
		"fill": "#feb24c",
		"d": "M219,266A16,16,0,1,1,218.9,266 z"
	},
	{
		"fill": "#feb24c",
		"d": "M146,183A18,18,0,1,1,145.9,183 z"
	},
	{
		"fill": "#feb24c",
		"d": "M281,184A19,19,0,1,1,280.9,184 z"
	},
	{
		"fill": "#feb24c",
		"d": "M220,225A17,17,0,1,1,219.9,225 z"
	},
	{
		"fill": "#feb24c",
		"d": "M144,224A17,17,0,1,1,143.9,224 z"
	},
	{
		"fill": "#feb24c",
		"d": "M387,262A16,16,0,1,1,386.9,262 z"
	},
	{
		"fill": "#feb24c",
		"d": "M217,181A19,19,0,1,1,216.9,181 z"
	},
	{
		"fill": "#fed976",
		"d": "M218,293A16,16,0,1,1,217.9,293 z"
	},
	{
		"fill": "#fed976",
		"d": "M363,333A14,14,0,1,1,362.9,333 z"
	},
	{
		"fill": "#fed976",
		"d": "M331,194A18,18,0,1,1,330.9,194 z"
	},
	{
		"fill": "#fed976",
		"d": "M163,290A15,15,0,1,1,162.9,290 z"
	},
	{
		"fill": "#fed976",
		"d": "M34,56A26,26,0,1,1,33.9,56 z"
	},
	{
		"fill": "#fed976",
		"d": "M268,332A14,14,0,1,1,267.9,332 z"
	},
	{
		"fill": "#fed976",
		"d": "M71,100A23,23,0,1,1,70.9,100 z"
	},
	{
		"fill": "#fed976",
		"d": "M119,222A17,17,0,1,1,118.9,222 z"
	},
	{
		"fill": "#fed976",
		"d": "M451,387A13,13,0,1,1,450.9,387 z"
	},
	{
		"fill": "#fed976",
		"d": "M64,84A24,24,0,1,1,63.9,84 z"
	},
	{
		"fill": "#fed976",
		"d": "M7,-7A26,26,0,1,1,6.9,-7 z"
	},
	{
		"fill": "#fed976",
		"d": "M434,192A18,18,0,1,1,433.9,192 z"
	},
	{
		"fill": "#fed976",
		"d": "M119,185A19,19,0,1,1,118.9,185 z"
	},
	{
		"fill": "#fed976",
		"d": "M-1,410A13,13,0,1,1,-1.1,410 z"
	},
	{
		"fill": "#fed976",
		"d": "M443,201A18,18,0,1,1,442.9,201 z"
	},
	{
		"fill": "#fed976",
		"d": "M121,245A17,17,0,1,1,120.9,245 z"
	},
	{
		"fill": "#fed976",
		"d": "M-4,386A14,14,0,1,1,-4.1,386 z"
	}
]`
      },
      {
        options: { 'mapType': 'Shaded Geohash Grid' },
        expected: `[
	{
		"fill": "#bd0026",
		"d": "M313 301L313 261L377 261L377 301z"
	},
	{
		"fill": "#bd0026",
		"d": "M313 261L313 218L377 218L377 261z"
	},
	{
		"fill": "#bd0026",
		"d": "M249 301L249 261L313 261L313 301z"
	},
	{
		"fill": "#f03b20",
		"d": "M377 261L377 218L441 218L441 261z"
	},
	{
		"fill": "#f03b20",
		"d": "M249 261L249 218L313 218L313 261z"
	},
	{
		"fill": "#f03b20",
		"d": "M313 338L313 301L377 301L377 338z"
	},
	{
		"fill": "#f03b20",
		"d": "M249 338L249 301L313 301L313 338z"
	},
	{
		"fill": "#fd8d3c",
		"d": "M121 301L121 261L185 261L185 301z"
	},
	{
		"fill": "#feb24c",
		"d": "M185 301L185 261L249 261L249 301z"
	},
	{
		"fill": "#feb24c",
		"d": "M121 218L121 170L185 170L185 218z"
	},
	{
		"fill": "#feb24c",
		"d": "M249 218L249 170L313 170L313 218z"
	},
	{
		"fill": "#feb24c",
		"d": "M185 261L185 218L249 218L249 261z"
	},
	{
		"fill": "#feb24c",
		"d": "M121 261L121 218L185 218L185 261z"
	},
	{
		"fill": "#feb24c",
		"d": "M377 301L377 261L441 261L441 301z"
	},
	{
		"fill": "#feb24c",
		"d": "M185 218L185 170L249 170L249 218z"
	},
	{
		"fill": "#fed976",
		"d": "M185 338L185 301L249 301L249 338z"
	},
	{
		"fill": "#fed976",
		"d": "M313 374L313 338L377 338L377 374z"
	},
	{
		"fill": "#fed976",
		"d": "M313 218L313 170L377 170L377 218z"
	},
	{
		"fill": "#fed976",
		"d": "M121 338L121 301L185 301L185 338z"
	},
	{
		"fill": "#fed976",
		"d": "M-7 116L-7 54L57 54L57 116z"
	},
	{
		"fill": "#fed976",
		"d": "M249 374L249 338L313 338L313 374z"
	},
	{
		"fill": "#fed976",
		"d": "M57 170L57 116L121 116L121 170z"
	},
	{
		"fill": "#fed976",
		"d": "M57 261L57 218L121 218L121 261z"
	},
	{
		"fill": "#fed976",
		"d": "M441 408L441 374L505 374L505 408z"
	},
	{
		"fill": "#fed976",
		"d": "M57 116L57 54L121 54L121 116z"
	},
	{
		"fill": "#fed976",
		"d": "M-7 54L-7 -21L57 -21L57 54z"
	},
	{
		"fill": "#fed976",
		"d": "M377 218L377 170L441 170L441 218z"
	},
	{
		"fill": "#fed976",
		"d": "M57 218L57 170L121 170L121 218z"
	},
	{
		"fill": "#fed976",
		"d": "M-7 441L-7 408L57 408L57 441z"
	},
	{
		"fill": "#fed976",
		"d": "M441 261L441 218L505 218L505 261z"
	},
	{
		"fill": "#fed976",
		"d": "M57 301L57 261L121 261L121 301z"
	},
	{
		"fill": "#fed976",
		"d": "M-7 408L-7 374L57 374L57 408z"
	}
]`
      }
    ].forEach(function (test) {

      it(test.options.mapType, function () {

        const geohashGridOptions = test.options;
        const geohashLayer = new GeohashLayer(GeoHashSampleData, geohashGridOptions, kibanaMap.getZoomLevel(), kibanaMap);
        kibanaMap.addLayer(geohashLayer);
        const markersNodeList = domNode.querySelectorAll('path.leaflet-clickable');
        const markerArray = [];
        for (let i = 0; i < markersNodeList.length; i++) {
          markerArray.push(markersNodeList[i]);
        }

        const expectedGeohashGridMarkers = test.expected;
        const expectedMarkers = JSON.parse(expectedGeohashGridMarkers).map(path => {
          return {
            fill: path.fill,
            coords: path.d.match(/[0-9\.]+/g).map(parseFloat)
          };
        });
        const actualMarkers = markerArray.map(a => {
          return {
            fill: a.getAttribute('fill'),
            coords: a.getAttribute('d').match(/[0-9\.]+/g).map(parseFloat)
          };
        });
        expect(actualMarkers.length).to.equal(expectedMarkers.length);
        for (let i = 0; i < expectedMarkers.length; i++) {
          expect(actualMarkers[i].fill).to.equal(expectedMarkers[i].fill);
          actualMarkers[i].coords.forEach((coord, c) => {
            closeTo(actualMarkers[i].coords[c], expectedMarkers[i].coords[c]);
          });
        }
      });
    });


    it('should not throw when fitting on empty-data layer', function () {

      const geohashLayer = new GeohashLayer({
        type: 'FeatureCollection',
        features: []
      }, { 'mapType': 'Scaled Circle Markers' }, kibanaMap.getZoomLevel(), kibanaMap);
      kibanaMap.addLayer(geohashLayer);

      expect(() => {
        kibanaMap.fitToData();
      }).to.not.throwException();
    });


  });

});


function closeTo(actual, expected) {
  const epsilon = 1;//allow 2px slack
  expect(actual - epsilon < expected && expected < actual + epsilon).to.equal(true);
}
