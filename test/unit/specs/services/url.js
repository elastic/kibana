define(function (require) {
  var sinon = require('test_utils/auto_release_sinon');
  var faker = require('faker');
  var _ = require('lodash');
  var rison = require('utils/rison');

  // global vars, injected and mocked in init()
  var kbnUrl;
  var $route;
  var $location;
  var $rootScope;
  var locationUrlSpy;
  var globalStateMock;

  require('components/url/url');

  function init() {
    globalStateMock = {
      removeFromUrl: function (url) {
        return url;
      }
    };

    module('kibana/url', 'kibana', function ($provide) {
      $provide.service('$route', function () {
        return {};
      });

      $provide.service('globalState', function () {
        return globalStateMock;
      });
    });

    inject(function ($injector) {
      $route = $injector.get('$route');
      $location = $injector.get('$location');
      $rootScope = $injector.get('$rootScope');
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

        var uniqWordCount = _.uniq(words, true).length;

        // validate our test data
        expect(words.length).to.be(wordCount + 1);

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

      it('should uri encode replaced params', function () {
        var url = '/some/path/';
        var params = { replace: faker.Lorem.words(3).join(' ') };
        var check = encodeURIComponent(params.replace);

        kbnUrl.change(url + '{{replace}}', params);

        expect(locationUrlSpy.secondCall.args[0]).to.be(url + check);
      });

      it('should parse angular expression in substitutions and uri encode the results', function () {
        // build url by piecing together these parts
        var urlParts = ['/', '/', '?', '&', '#'];
        // make sure it can parse templates with weird spacing
        var wrappers = [ ['{{', '}}'], ['{{ ', ' }}'], ['{{', '  }}'], ['{{    ', '}}'], ['{{    ', '         }}']];
        // make sure filters are evaluated via angular expressions
        var objIndex = 4; // used to case one replace as an object
        var filters = ['', 'uppercase', '', 'uppercase', 'rison'];

        // the words (template keys) used must all be unique
        var words = _.uniq(faker.Lorem.words(10)).slice(0, urlParts.length).map(function (word, i) {
          if (filters[i].length) {
            return word + '|' + filters[i];
          }
          return word;
        });

        var replacements = faker.Lorem.words(urlParts.length).map(function (word, i) {
          // make selected replacement into an object
          if (i === objIndex) {
            return { replace: word };
          }

          return word;
        });

        // build the url and test url
        var url = '';
        var testUrl = '';
        urlParts.forEach(function (part, i) {
          url += part + wrappers[i][0] + words[i] + wrappers[i][1];
          var locals = {};
          locals[words[i].split('|')[0]] = replacements[i];
          testUrl += part + encodeURIComponent($rootScope.$eval(words[i], locals));
        });

        // create the locals replacement object
        var params = {};
        replacements.forEach(function (replacement, i) {
          var word = words[i].split('|')[0];
          params[word] = replacement;
        });

        kbnUrl.change(url, params);

        expect(locationUrlSpy.secondCall.args[0]).to.not.be(url);
        expect(locationUrlSpy.secondCall.args[0]).to.be(testUrl);
      });

      it('should handle dot notation', function () {
        var url = '/some/thing/{{that.is.substituted}}';

        kbnUrl.change(url, {
          that: {
            is: {
              substituted: 'test'
            }
          }
        });

        expect($location.url()).to.be('/some/thing/test');
      });

      it('should throw when params are missing', function () {
        var url = '/{{replace_me}}';
        var params = {};

        try {
          kbnUrl.change(url, params);
          throw new Error('this should not run');
        } catch (err) {
          expect(err).to.be.an(Error);
          expect(err.message).to.match(/replace_me/);
        }
      });

      it('should throw when filtered params are missing', function () {
        var url = '/{{replace_me|number}}';
        var params = {};

        try {
          kbnUrl.change(url, params);
          throw new Error('this should not run');
        } catch (err) {
          expect(err).to.be.an(Error);
          expect(err.message).to.match(/replace_me\|number/);
        }
      });
    });

    describe('changePath', function () {
      beforeEach(function () {
        sinon.stub(kbnUrl, 'matches', function () { return false; });
        sinon.stub(kbnUrl, 'reload');
      });

      it('should only change the path', function () {
        var path = '/test/path';
        var search = {search: 'test'};
        var hash = 'hash';
        var newPath = '/new/location';

        $location.path(path).search(search).hash(hash);

        // verify the starting state
        expect($location.url()).to.be(path + '?search=test#hash');

        kbnUrl.changePath(newPath);
        expect($location.url()).to.be(newPath + '?search=test#hash');
      });

      it('should set $location.url and call reload when path changes', function () {
        for (var i = 0; i < _.random(3, 6); i++) {
          kbnUrl.changePath('/new/path/' + i);
          expect(kbnUrl.reload.callCount).to.be(i + 1);
        }
      });

      it('should reload when forceReload is set', function () {
        var path = '/test/path';

        kbnUrl.changePath(path);
        expect(kbnUrl.reload.callCount).to.be(1);

        // same url, no change in reload count
        kbnUrl.changePath(path);
        expect(kbnUrl.reload.callCount).to.be(1);

        // same url again, but with forceReload true
        kbnUrl.changePath(path, true);
        expect(kbnUrl.reload.callCount).to.be(2);
      });
    });

    describe('reload', function () {
      require('test_utils/no_digest_promises').activateForSuite();

      beforeEach(function () {
        $route.reload = sinon.spy();
      });

      it('should call $route.reload and update the reloading state', function () {
        expect(kbnUrl.reloading).to.be(false);
        kbnUrl.reload();
        expect(kbnUrl.reloading).to.be(true);
        expect($route.reload.callCount).to.be(1);
      });

      it('should not reload when reloading state is true', function () {
        kbnUrl.reload();
        expect(kbnUrl.reloading).to.be(true);
        kbnUrl.reload();
        expect($route.reload.callCount).to.be(1);
      });

      it('should reset the running state when routes change', function (done) {
        kbnUrl.reload();
        expect(kbnUrl.reloading).to.be(true);

        function checkEvent(event, handler) {
          $rootScope.$on(event, handler);
          $rootScope.$emit(event);
        }

        checkEvent('$routeUpdate', function () {
          expect(kbnUrl.reloading).to.be(false);

          kbnUrl.reload();
          expect(kbnUrl.reloading).to.be(true);

          checkEvent('$routeChangeStart', function () {
            expect(kbnUrl.reloading).to.be(false);

            done();
          });
        });
      });
    });

    describe('matches', function () {
      it('should return false if no route is set', function () {
        $route.current = { $$route: undefined };

        var match = kbnUrl.matches('/test');
        expect(match).to.be(false);
      });

      it('should return false when not matching route', function () {
        var url = '/' + faker.Lorem.words(3).join('/');
        $route.current = { $$route:
          {
            regexp: new RegExp(url + 'fail')
          }
        };

        var match = kbnUrl.matches(url);
        expect(match).to.be(false);
      });
      it('should return true when matching route', function () {
        var url = '/' + faker.Lorem.words(3).join('/');

        $route.current = {
          $$route: {
            regexp: new RegExp(url)
          }
        };

        var match = kbnUrl.matches(url);
        expect(match).to.be(true);
      });
    });
  });
});