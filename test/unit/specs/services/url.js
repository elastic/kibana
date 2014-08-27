define(function (require) {
  var sinon = require('test_utils/auto_release_sinon');
  var faker = require('faker');
  var _ = require('lodash');

  // global vars, injected and mocked in init()
  var kbnUrl;
  var $route;
  var $location;
  var locationUrlSpy;
  var globalStateMock;

  require('components/url/url');

  function init() {
    globalStateMock = {
      writeToUrl: function (url) {
        return url;
      }
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

      locationUrlSpy = sinon.spy($location, 'url');
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

      it('should set $location.url and call reload when given new url', function () {
        var wordCount = _.random(3, 6);
        var callCount = 0;
        var lastUrl;

        var words = faker.Lorem.words(wordCount);

        // add repeat word to check that url doesn't change again
        words.push(words[wordCount - 1]);

        var uniqWordCount = _.uniq(words).length;

        expect(words.length).to.be(wordCount + 1);
        expect(uniqWordCount).to.be(wordCount);

        words.forEach(function (url) {
          url = '/' + url;

          kbnUrl.change(url);

          // 1 for getter
          callCount++;

          if (lastUrl !== url) {
            // 1 for setter
            callCount++;
          }

          expect($location.url()).to.be(url);
          // we called $location.url again, increment when checking
          expect(locationUrlSpy.callCount).to.be(++callCount);

          lastUrl = url;
        });

        expect(kbnUrl.reload.callCount).to.be(uniqWordCount);
      });

      it('should reload when forceReload is true', function () {
        var words = [faker.Lorem.words(_.random(2, 6)).join('/')];
        words.push(words[0]);

        words.forEach(function (url) {
          url = '/' + url;

          kbnUrl.change(url, {}, true);
        });

        expect(kbnUrl.reload.callCount).to.be(words.length);
      });

      it('should allow forceReload as the 2nd param', function () {
        var words = [faker.Lorem.words(_.random(4, 10)).join('/')];
        words.push(words[0]);

        words.forEach(function (url) {
          url = '/' + url;

          kbnUrl.change(url, true);
        });

        expect(kbnUrl.reload.callCount).to.be(words.length);
      });

      it('should replace template params', function () {
        var words = faker.Lorem.words(3);
        var replace = faker.Lorem.words(2);
        var url = '/' + words[0] + '/{' + words[1] + '}?{' + words[2] + '}';
        var params = {};
        params[words[1]] = replace[0];
        params[words[2]] = replace[1];

        kbnUrl.change(url, params);

        expect(locationUrlSpy.secondCall.args[0]).to.not.be(url);
        expect(locationUrlSpy.secondCall.args[0]).to.be('/' + words[0] + '/' + replace[0] + '?' + replace[1]);
      });
      it('should rison encode template parameters');
      it('should throw when params are missing');
    });

    describe('reload', function () {
      it('should not reload when another reload is running');
    });

    describe('matches', function () {
      it('should return null if no route is set');
      it('should return true when matching route');
      it('should return false when not matching route');
    });
  });
});