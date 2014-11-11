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
        return {
          reload: _.noop
        };
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
      });

      it('should set $location.url and not call reload', function () {
        var wordCount = _.random(3, 6);
        var callCount = 0;
        var lastUrl;

        var words = faker.Lorem.words(wordCount);

        // add repeat word to check that url doesn't change again
        words.push(words[wordCount - 1]);

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

      it('should change the entire url', function () {
        var path = '/test/path';
        var search = {search: 'test'};
        var hash = 'hash';
        var newPath = '/new/location';

        $location.path(path).search(search).hash(hash);

        // verify the starting state
        expect($location.path()).to.be(path);
        expect($location.search()).to.eql(search);
        expect($location.hash()).to.be(hash);

        kbnUrl.change(newPath);

        // verify the ending state
        expect($location.path()).to.be(newPath);
        expect($location.search()).to.eql({});
        expect($location.hash()).to.be('');
      });
    });

    describe('changePath', function () {
      it('should change just the path', function () {
        var path = '/test/path';
        var search = {search: 'test'};
        var hash = 'hash';
        var newPath = '/new/location';

        $location.path(path).search(search).hash(hash);

        // verify the starting state
        expect($location.path()).to.be(path);
        expect($location.search()).to.eql(search);
        expect($location.hash()).to.be(hash);

        kbnUrl.changePath(newPath);

        // verify the ending state
        expect($location.path()).to.be(newPath);
        expect($location.search()).to.eql(search);
        expect($location.hash()).to.be(hash);
      });
    });

    describe('redirect', function () {
      it('should change the entire url', function () {
        var path = '/test/path';
        var search = {search: 'test'};
        var hash = 'hash';
        var newPath = '/new/location';

        $location.path(path).search(search).hash(hash);

        // verify the starting state
        expect($location.path()).to.be(path);
        expect($location.search()).to.eql(search);
        expect($location.hash()).to.be(hash);

        kbnUrl.redirect(newPath);

        // verify the ending state
        expect($location.path()).to.be(newPath);
        expect($location.search()).to.eql({});
        expect($location.hash()).to.be('');
      });

      it('should replace the current history entry', function () {
        sinon.stub($location, 'replace');
        $location.url('/some/path');

        expect($location.replace.callCount).to.be(0);
        kbnUrl.redirect('/new/path/');
        expect($location.replace.callCount).to.be(1);
      });

      it('should call replace on $location', function () {
        sinon.stub(kbnUrl, 'shouldAutoReload').returns(false);
        sinon.stub($location, 'replace');

        expect($location.replace.callCount).to.be(0);
        kbnUrl.redirect('/poop');
        expect($location.replace.callCount).to.be(1);
      });

      it('should reload the $route in the next digest tick if needed', function () {
        sinon.stub($route, 'reload');
        sinon.stub(kbnUrl, 'shouldAutoReload').returns(true);

        kbnUrl.redirect('/some/path');
        expect($route.reload.callCount).to.be(0);
        $rootScope.$apply();
        expect($route.reload.callCount).to.be(1);


        kbnUrl.shouldAutoReload.returns(false);
        kbnUrl.redirect('/some/path?q=1');
        expect($route.reload.callCount).to.be(1);
        $rootScope.$apply();
        expect($route.reload.callCount).to.be(1);
      });
    });

    describe('redirectPath', function () {
      it('should only change the path', function () {
        var path = '/test/path';
        var search = {search: 'test'};
        var hash = 'hash';
        var newPath = '/new/location';

        $location
          .path(path)
          .search(search)
          .hash(hash);

        // verify the starting state
        expect($location.path()).to.be(path);
        expect($location.search()).to.eql(search);
        expect($location.hash()).to.be(hash);

        kbnUrl.redirectPath(newPath);

        // verify the ending state
        expect($location.path()).to.be(newPath);
        expect($location.search()).to.eql(search);
        expect($location.hash()).to.be(hash);
      });

      it('should call replace on $location', function () {
        sinon.stub(kbnUrl, 'shouldAutoReload').returns(false);
        sinon.stub($location, 'replace');

        expect($location.replace.callCount).to.be(0);
        kbnUrl.redirectPath('/poop');
        expect($location.replace.callCount).to.be(1);
      });

      it('should reload the $route in the next digest tick if needed', function () {
        sinon.stub($route, 'reload');
        sinon.stub(kbnUrl, 'shouldAutoReload').returns(true);

        kbnUrl.redirectPath('/some/path');
        expect($route.reload.callCount).to.be(0);
        $rootScope.$apply();
        expect($route.reload.callCount).to.be(1);


        kbnUrl.shouldAutoReload.returns(false);
        kbnUrl.redirectPath('/some/path?q=1');
        expect($route.reload.callCount).to.be(1);
        $rootScope.$apply();
        expect($route.reload.callCount).to.be(1);
      });
    });

    describe('shouldAutoReload', function () {
      beforeEach(function () {
        $route.current = {
          $$route: {
            regexp: /^\/is-current-route/,
            reloadOnSearch: false
          }
        };
      });

      it('returns false if the passed url doesn\'t match the current route', function () {
        expect(
          kbnUrl.shouldAutoReload('/not-current-route')
        ).to.be(false);
      });

      describe('if the passed url does match the route', function () {
        describe('and the route does not reload on search', function () {
          describe('and the url is the same', function () {
            it('returns true', function () {
              $location.url('/is-current-route?q=search');
              expect(kbnUrl.shouldAutoReload('/is-current-route?q=search')).to.be(true);
            });
          });
          describe('and the url is different', function () {
            it('returns true', function () {
              $location.url('/is-current-route?q=search');
              expect(kbnUrl.shouldAutoReload('/is-current-route?q=search')).to.be(true);
            });
          });
        });

        describe('but the route reloads on search', function () {
          beforeEach(function () { $route.current.$$route.reloadOnSearch = true; });
          describe('and the url is different', function () {
            it('returns false', function () {
              $location.url('/is-current-route?q=search');
              expect(kbnUrl.shouldAutoReload('/is-current-route?q=some other search')).to.be(false);
            });
          });
          describe('and the url is the same', function () {
            it('returns true', function () {
              $location.url('/is-current-route?q=search');
              expect(kbnUrl.shouldAutoReload('/is-current-route?q=search')).to.be(true);
            });
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