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

import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import chrome from '../../chrome';
import { UrlShortenerProvider } from '../lib/url_shortener';

describe('Url shortener', () => {
  let urlShortener;
  let $httpBackend;
  const shareId = 'id123';

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_$rootScope_, _$location_, _$httpBackend_, Private) {
    $httpBackend = _$httpBackend_;
    urlShortener = Private(UrlShortenerProvider);
  }));

  describe('Shorten without base path', () => {
    it('should shorten urls with a port', function (done) {
      $httpBackend.when('POST', '/shorten').respond(function (type, route, data) {
        expect(JSON.parse(data).url).to.be('/app/kibana#123');
        return [200, shareId];
      });
      urlShortener.shortenUrl('http://localhost:5601/app/kibana#123').then(function (url) {
        expect(url).to.be(`http://localhost:5601/goto/${shareId}`);
        done();
      });
      $httpBackend.flush();
    });

    it('should shorten urls without a port', function (done) {
      $httpBackend.when('POST', '/shorten').respond(function (type, route, data) {
        expect(JSON.parse(data).url).to.be('/app/kibana#123');
        return [200, shareId];
      });
      urlShortener.shortenUrl('http://localhost/app/kibana#123').then(function (url) {
        expect(url).to.be(`http://localhost/goto/${shareId}`);
        done();
      });
      $httpBackend.flush();
    });
  });

  describe('Shorten with base path', () => {
    const basePath = '/foo';

    let getBasePath;
    beforeEach(ngMock.inject((Private) => {
      getBasePath = sinon.stub(chrome, 'getBasePath').returns(basePath);
      urlShortener = Private(UrlShortenerProvider);
    }));

    it('should shorten urls with a port', (done) => {
      $httpBackend.when('POST', `${basePath}/shorten`).respond((type, route, data) => {
        expect(JSON.parse(data).url).to.be('/app/kibana#123');
        return [200, shareId];
      });
      urlShortener.shortenUrl(`http://localhost:5601${basePath}/app/kibana#123`).then((url) => {
        expect(url).to.be(`http://localhost:5601${basePath}/goto/${shareId}`);
        done();
      });
      $httpBackend.flush();
    });

    it('should shorten urls without a port', (done) => {
      $httpBackend.when('POST', `${basePath}/shorten`).respond((type, route, data) => {
        expect(JSON.parse(data).url).to.be('/app/kibana#123');
        return [200, shareId];
      });
      urlShortener.shortenUrl(`http://localhost${basePath}/app/kibana#123`).then((url) => {
        expect(url).to.be(`http://localhost${basePath}/goto/${shareId}`);
        done();
      });
      $httpBackend.flush();
    });

    it('should shorten urls with a query string', (done) => {
      $httpBackend.when('POST', `${basePath}/shorten`).respond((type, route, data) => {
        expect(JSON.parse(data).url).to.be('/app/kibana?foo#123');
        return [200, shareId];
      });
      urlShortener.shortenUrl(`http://localhost${basePath}/app/kibana?foo#123`).then((url) => {
        expect(url).to.be(`http://localhost${basePath}/goto/${shareId}`);
        done();
      });
      $httpBackend.flush();
    });

    it('should shorten urls without a hash', (done) => {
      $httpBackend.when('POST', `${basePath}/shorten`).respond((type, route, data) => {
        expect(JSON.parse(data).url).to.be('/app/kibana');
        return [200, shareId];
      });
      urlShortener.shortenUrl(`http://localhost${basePath}/app/kibana`).then((url) => {
        expect(url).to.be(`http://localhost${basePath}/goto/${shareId}`);
        done();
      });
      $httpBackend.flush();
    });

    it('should shorten urls with a query string in the hash', (done) => {
      const relativeUrl = "/app/kibana#/discover?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(_source),index:%27logstash-*%27,interval:auto,query:(query_string:(analyze_wildcard:!t,query:%27*%27)),sort:!(%27@timestamp%27,desc))"; //eslint-disable-line max-len, quotes
      $httpBackend.when('POST', `${basePath}/shorten`).respond((type, route, data) => {
        expect(JSON.parse(data).url).to.be(relativeUrl);
        return [200, shareId];
      });
      urlShortener.shortenUrl(`http://localhost${basePath}${relativeUrl}`).then((url) => {
        expect(url).to.be(`http://localhost${basePath}/goto/${shareId}`);
        done();
      });
      $httpBackend.flush();
    });

    afterEach(() => {
      getBasePath.restore();
    });
  });
});
