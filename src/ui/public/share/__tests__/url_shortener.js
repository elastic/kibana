import _ from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import chrome from 'ui/chrome';
import LibUrlShortenerProvider from 'ui/share/lib/url_shortener';

describe('Url shortener', function () {
  let $rootScope;
  let $location;
  let $http;
  let urlShortener;
  let $httpBackend;
  const shareId = 'id123';

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_$rootScope_, _$location_, _$httpBackend_, Private) {
    $location = _$location_;
    $rootScope = _$rootScope_;
    $httpBackend = _$httpBackend_;
    urlShortener = Private(LibUrlShortenerProvider);
  }));

  describe('Shorten without base path', function () {
    it('should shorten urls with a port', function (done) {
      $httpBackend.when('POST', '/shorten').respond(function (type, route, data) {
        expect(JSON.parse(data).url).to.be('/app/kibana#123');
        return [200, shareId];
      });
      urlShortener.shortenUrl('http://localhost:5601/app/kibana#123').then(function (url) {
        expect(url).to.be('http://localhost:5601/goto/id123');
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
        expect(url).to.be('http://localhost/goto/id123');
        done();
      });
      $httpBackend.flush();
    });
  });

  describe('Shorten with base path', function () {
    const basePath = '/foo';

    let getBasePath;
    beforeEach(ngMock.inject(function (Private) {
      getBasePath = sinon.stub(chrome, 'getBasePath', () => basePath);
      urlShortener = Private(LibUrlShortenerProvider);
    }));

    it('should shorten urls with a port', function (done) {
      $httpBackend.when('POST', `${basePath}/shorten`).respond(function (type, route, data) {
        expect(JSON.parse(data).url).to.be('/app/kibana#123');
        return [200, shareId];
      });
      urlShortener.shortenUrl(`http://localhost:5601${basePath}/app/kibana#123`).then(function (url) {
        expect(url).to.be(`http://localhost:5601${basePath}/goto/id123`);
        done();
      });
      $httpBackend.flush();
    });

    it('should shorten urls without a port', function (done) {
      $httpBackend.when('POST', `${basePath}/shorten`).respond(function (type, route, data) {
        expect(JSON.parse(data).url).to.be('/app/kibana#123');
        return [200, shareId];
      });
      urlShortener.shortenUrl(`http://localhost${basePath}/app/kibana#123`).then(function (url) {
        expect(url).to.be(`http://localhost${basePath}/goto/id123`);
        done();
      });
      $httpBackend.flush();
    });

    afterEach(function () {
      getBasePath.restore();
    });
  });
});
