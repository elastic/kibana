/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from 'expect.js';
import ngMock from 'ng_mock';
import url from 'url';
import sinon from 'sinon';

describe('service_settings (FKA tilemaptest)', function () {


  let serviceSettings;
  let mapConfig;
  let tilemapsConfig;

  const manifestUrl = 'https://geo.elastic.co/v1/manifest';
  const tmsManifestUrl = `https://tiles.elastic.co/v2/manifest`;
  const vectorManifestUrl = `https://layers.geo.elastic.co/v1/manifest`;
  const manifestUrl2 = 'https://foobar/v1/manifest';

  const manifest = {
    'services': [{
      'id': 'tiles_v2',
      'name': 'Elastic Tile Service',
      'manifest': tmsManifestUrl,
      'type': 'tms'
    },
    {
      'id': 'geo_layers',
      'name': 'Elastic Layer Service',
      'manifest': vectorManifestUrl,
      'type': 'file'
    }
    ]
  };

  const tmsManifest = {
    'services': [{
      'id': 'road_map',
      'url': 'https://tiles.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana',
      'minZoom': 0,
      'maxZoom': 10,
      'attribution': '© [OpenStreetMap](http://www.openstreetmap.org/copyright) © [Elastic Maps Service](https://www.elastic.co/elastic-maps-service)'
    }]
  };

  const vectorManifest = {
    'layers': [{
      'attribution': '',
      'name': 'US States',
      'format': 'geojson',
      'url': 'https://storage.googleapis.com/elastic-layer.appspot.com/L2FwcGhvc3RpbmdfcHJvZC9ibG9icy9BRW5CMlVvNGJ0aVNidFNJR2dEQl9rbTBjeXhKMU01WjRBeW1kN3JMXzM2Ry1qc3F6QjF4WE5XdHY2ODlnQkRpZFdCY2g1T2dqUGRHSFhSRTU3amlxTVFwZjNBSFhycEFwV2lYR29vTENjZjh1QTZaZnRpaHBzby5VXzZoNk1paGJYSkNPalpI?elastic_tile_service_tos=agree',
      'fields': [{ 'name': 'postal', 'description': 'Two letter abbreviation' }, {
        'name': 'name',
        'description': 'State name'
      }],
      'created_at': '2017-04-26T19:45:22.377820',
      'id': 5086441721823232
    }, {
      'attribution': 'Â© [Elastic Tile Service](https://www.elastic.co/elastic-maps-service)',
      'name': 'World Countries',
      'format': 'geojson',
      'url': 'https://storage.googleapis.com/elastic-layer.appspot.com/L2FwcGhvc3RpbmdfcHJvZC9ibG9icy9BRW5CMlVwWTZTWnhRRzNmUk9HUE93TENjLXNVd2IwdVNpc09SRXRyRzBVWWdqOU5qY2hldGJLOFNZSFpUMmZmZWdNZGx0NWprT1R1ZkZ0U1JEdFBtRnkwUWo0S0JuLTVYY1I5RFdSMVZ5alBIZkZuME1qVS04TS5oQTRNTl9yRUJCWk9tMk03?elastic_tile_service_tos=agree',
      'fields': [{ 'name': 'iso2', 'description': 'Two letter abbreviation' }, {
        'name': 'name',
        'description': 'Country name'
      }, { 'name': 'iso3', 'description': 'Three letter abbreviation' }],
      'created_at': '2017-04-26T17:12:15.978370',
      'id': 5659313586569216
    }]
  };


  beforeEach(ngMock.module('kibana', ($provide) => {
    $provide.decorator('mapConfig', () => {
      return {
        manifestServiceUrl: manifestUrl,
        includeElasticMapsService: true
      };
    });
  }));


  let manifestServiceUrlOriginal;
  let tilemapsConfigDeprecatedOriginal;
  beforeEach(ngMock.inject(function ($injector, $rootScope) {

    serviceSettings = $injector.get('serviceSettings');
    mapConfig = $injector.get('mapConfig');
    tilemapsConfig = $injector.get('tilemapsConfig');

    manifestServiceUrlOriginal = mapConfig.manifestServiceUrl;
    tilemapsConfigDeprecatedOriginal = tilemapsConfig.deprecated;

    sinon.stub(serviceSettings, '_getManifest').callsFake((url) => {
      let contents = null;
      if (url.startsWith(tmsManifestUrl)) {
        contents = tmsManifest;
      } else if (url.startsWith(vectorManifestUrl)) {
        contents = vectorManifest;
      } else if (url.startsWith(manifestUrl)) {
        contents = manifest;
      } else if (url.startsWith(manifestUrl2)) {
        contents = manifest;
      }
      return {
        data: contents
      };
    });
    $rootScope.$digest();
  }));

  afterEach(function () {
    serviceSettings._getManifest.restore();
    mapConfig.manifestServiceUrl = manifestServiceUrlOriginal;
    tilemapsConfig.deprecated = tilemapsConfigDeprecatedOriginal;
  });

  describe('TMS', function () {

    it('should NOT get url from the config', async function () {
      const tmsServices = await serviceSettings.getTMSServices();
      const tmsService = tmsServices[0];
      expect(typeof tmsService.url === 'undefined').to.equal(true);
    });

    it('should get url by resolving dynamically', async function () {

      const tmsServices = await serviceSettings.getTMSServices();
      const tmsService = tmsServices[0];
      expect(typeof tmsService.url === 'undefined').to.equal(true);

      const mapUrl = await serviceSettings.getUrlTemplateForTMSLayer(tmsService);
      expect(mapUrl).to.contain('{x}');
      expect(mapUrl).to.contain('{y}');
      expect(mapUrl).to.contain('{z}');

      const urlObject = url.parse(mapUrl, true);
      expect(urlObject.hostname).to.be('tiles.elastic.co');
      expect(urlObject.query).to.have.property('my_app_name', 'kibana');
      expect(urlObject.query).to.have.property('elastic_tile_service_tos', 'agree');
      expect(urlObject.query).to.have.property('my_app_version');
    });

    it('should get options', async function () {
      const tmsServices = await serviceSettings.getTMSServices();
      const tmsService = tmsServices[0];
      expect(tmsService).to.have.property('minZoom');
      expect(tmsService).to.have.property('maxZoom');
      expect(tmsService).to.have.property('attribution').contain('&#169;');
    });

    describe('modify - url', function () {

      let tilemapServices;

      async function assertQuery(expected) {
        const mapUrl = await serviceSettings.getUrlTemplateForTMSLayer(tilemapServices[0]);
        const urlObject = url.parse(mapUrl, true);
        Object.keys(expected).forEach(key => {
          expect(urlObject.query).to.have.property(key, expected[key]);
        });
      }

      it('accepts an object', async () => {
        serviceSettings.addQueryParams({ foo: 'bar' });
        tilemapServices = await serviceSettings.getTMSServices();
        await assertQuery({ foo: 'bar' });
      });

      it('merged additions with previous values', async () => {
        // ensure that changes are always additive
        serviceSettings.addQueryParams({ foo: 'bar' });
        serviceSettings.addQueryParams({ bar: 'stool' });
        tilemapServices = await serviceSettings.getTMSServices();
        await assertQuery({ foo: 'bar', bar: 'stool' });
      });

      it('overwrites conflicting previous values', async () => {
        // ensure that conflicts are overwritten
        serviceSettings.addQueryParams({ foo: 'bar' });
        serviceSettings.addQueryParams({ bar: 'stool' });
        serviceSettings.addQueryParams({ foo: 'tstool' });
        tilemapServices = await serviceSettings.getTMSServices();
        await assertQuery({ foo: 'tstool', bar: 'stool' });
      });

      it('when overridden, should continue to work', async () => {
        mapConfig.manifestServiceUrl = manifestUrl2;
        serviceSettings.addQueryParams({ foo: 'bar' });
        tilemapServices = await serviceSettings.getTMSServices();
        await assertQuery({ foo: 'bar' });
      });


      it('should merge in tilemap url', async () => {

        tilemapsConfig.deprecated = {
          'isOverridden': true,
          'config': {
            'url': 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'options': { 'minZoom': 0, 'maxZoom': 20 }
          }
        };

        tilemapServices = await serviceSettings.getTMSServices();
        const expected = [
          {
            'attribution': '',
            'url': 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'id': 'TMS in config/kibana.yml'
          },
          {
            'id': 'road_map',
            'url': 'https://tiles.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3',
            'minZoom': 0,
            'maxZoom': 10,
            'attribution': '<p>&#169; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &#169; <a href="https://www.elastic.co/elastic-maps-service">Elastic Maps Service</a></p>&#10;',
            'subdomains': []
          }
        ];


        const assertions = tilemapServices.map(async (actualService, index) => {
          const expectedService = expected[index];
          expect(actualService.id).to.equal(expectedService.id);
          expect(actualService.attribution).to.equal(expectedService.attribution);
          const url = await serviceSettings.getUrlTemplateForTMSLayer(actualService);
          expect(url).to.equal(expectedService.url);
        });

        return Promise.all(assertions);

      });


      it('should exclude EMS', async () => {

        tilemapsConfig.deprecated = {
          'isOverridden': true,
          'config': {
            'url': 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'options': { 'minZoom': 0, 'maxZoom': 20 }
          }
        };
        mapConfig.includeElasticMapsService = false;

        tilemapServices = await serviceSettings.getTMSServices();
        const expected = [
          {
            'attribution': '',
            'url': 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'id': 'TMS in config/kibana.yml'
          }
        ];
        expect(tilemapServices.length).to.eql(1);
        expect(tilemapServices[0].attribution).to.eql(expected[0].attribution);
        expect(tilemapServices[0].id).to.eql(expected[0].id);
        const url = await serviceSettings.getUrlTemplateForTMSLayer(tilemapServices[0]);
        expect(url).to.equal(expected[0].url);

      });

      it('should exclude all when not configured', async () => {
        mapConfig.includeElasticMapsService = false;
        tilemapServices = await serviceSettings.getTMSServices();
        const expected = [];
        expect(tilemapServices).to.eql(expected);
      });


    });


  });

  describe('File layers', function () {

    it('should load manifest', async function () {
      serviceSettings.addQueryParams({ foo: 'bar' });
      const fileLayers = await serviceSettings.getFileLayers();
      const asserttions = fileLayers.map(async function (fileLayer, index) {
        const expected = vectorManifest.layers[index];
        expect(expected.attribution).to.eql(fileLayer.attribution);
        expect(expected.format).to.eql(fileLayer.format);
        expect(expected.fields).to.eql(fileLayer.fields);
        expect(expected.name).to.eql(fileLayer.name);
        expect(expected.created_at).to.eql(fileLayer.created_at);

        const fileUrl = await serviceSettings.getUrlForRegionLayer(fileLayer);
        const urlObject = url.parse(fileUrl, true);
        Object.keys({ foo: 'bar', elastic_tile_service_tos: 'agree' }).forEach(key => {
          expect(urlObject.query).to.have.property(key, expected[key]);
        });

      });

      return Promise.all(asserttions);
    });

    it('should exclude all when not configured', async () => {
      mapConfig.includeElasticMapsService = false;
      const fileLayers = await serviceSettings.getFileLayers();
      const expected = [];
      expect(fileLayers).to.eql(expected);
    });

  });
});
