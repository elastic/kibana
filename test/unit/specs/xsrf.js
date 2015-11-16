describe('xsrf protection', function () {
  context('Angular support', function () {
    var xsrfHeader = 'kbn-xsrf-token';
    var xsrfToken;

    var $http;
    var $httpBackend;

    beforeEach(module('kibana'));
    beforeEach(inject(function ($injector, configFile) {
      $http = $injector.get('$http');
      $httpBackend = $injector.get('$httpBackend');

      if (!configFile.xsrf_token) {
        throw new Error('Config file does not include xsrf_token');
      } else {
        xsrfToken = configFile.xsrf_token;
      }

      $httpBackend
        .when('POST', '/api/test')
        .respond('ok');
    }));

    afterEach(function () {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    it('injects a kbn-xsrf-token header on every request', function () {
      $httpBackend.expectPOST('/api/test', undefined, function (headers) {
        return headers[xsrfHeader] === xsrfToken;
      }).respond(200, '');

      $http.post('/api/test');
      $httpBackend.flush();
    });
  });
});
