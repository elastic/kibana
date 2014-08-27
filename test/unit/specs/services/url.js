define(function (require) {
  var sinon = require('test_utils/auto_release_sinon');
  var faker = require('faker');

  // global vars, injected and mocked in init()
  var kbnUrl;
  var $route;
  var $location;
  var globalStateMock;

  require('components/url/url');

  function init() {
    globalStateMock = {
      writeToUrl: sinon.stub()
    };

    module('kibana/url', function ($provide) {
      $provide.service('$route', function () {
      });

      $provide.service('globalState', function () {
        return globalStateMock;
      });
    });

    inject(function ($injector) {
      $route = $injector.get('$route');
      $location = $injector.get('$location');
      kbnUrl = $injector.get('kbnUrl');
    });
  }

  describe('kbnUrl', function () {
    beforeEach(function () {
      init();
    });

    describe('change', function () {
      beforeEach(function () {
        sinon.stub(kbnUrl, 'matches', function () { return false; });
        sinon.stub(kbnUrl, 'reload');
      });

      it('should set $location.url when given new url', function () {
        var wordCount = 5;
        var callCount = 0;
        var lastUrl;
        var urlSpy = sinon.spy($location, 'url');

        var words = faker.Lorem.words(wordCount);

        // add repeat word to check that url doesn't change again
        words.push(words[wordCount - 1]);

        words.forEach(function (url) {
          url = '/' + url;
          // make the mocked method return what we expect
          globalStateMock.writeToUrl.returns(url);

          kbnUrl.change(url);

          if (lastUrl !== url) {
            // 1 for getter
            // 1 for setter
            callCount += 2;
          } else {
            // 1 for getter
            callCount++;
          }

          expect($location.url()).to.be(url);
          // we called $location.url again, increment when checking
          expect(urlSpy.callCount).to.be(++callCount);

          lastUrl = url;
        });

        console.log('no fakin');
      });

      it('should allow forceReload as the 2nd param');
      it('should replace template params');
      it('should rison encode template parameters');
      it('should throw when params are missing');
    });

    describe('reload', function () {
      it('should reload on new url');
      it('should reload when forceReload is true');
      it('should not reload when url is the same');
      it('should not reload when another reload is running');
    });

    describe('match', function () {
      it('should return null if no route is set');
      it('should return true when matching route');
      it('should return false when not matching route');
    });
  });
});