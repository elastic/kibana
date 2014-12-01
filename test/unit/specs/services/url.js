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
  var globalStateMock;

  require('components/url/url');

  function init() {
    module('kibana/url', 'kibana', function ($provide) {
      $provide.service('$route', function () {
        return {
          reload: _.noop
        };
      });

      $provide.service('globalState', function () {
        globalStateMock = {};
        globalStateMock.on = globalStateMock.off = _.noop;
        globalStateMock.removeFromUrl = function (url) {
          return url;
        };

        return globalStateMock;
      });
    });

    inject(function ($injector) {
      $route = $injector.get('$route');
      $location = $injector.get('$location');
      $rootScope = $injector.get('$rootScope');
      kbnUrl = $injector.get('kbnUrl');
    });
  }

  describe('kbnUrl', function () {
    beforeEach(function () {
      init();
    });

    describe('forcing reload', function () {
      it('schedules a listener for $locationChangeSuccess on the $rootScope', function () {
        $location.url('/url');
        $route.current = {
          $$route: {
            regex: /.*/
          }
        };

        sinon.stub($rootScope, '$on');

        expect($rootScope.$on.callCount).to.be(0);
        kbnUrl.change('/url');
        expect($rootScope.$on.callCount).to.be(1);
        expect($rootScope.$on.firstCall.args[0]).to.be('$locationChangeSuccess');
      });

      it('handler unbinds the listener and calls reload', function () {
        $location.url('/url');
        $route.current = {
          $$route: {
            regex: /.*/
          }
        };

        var unbind = sinon.stub();
        sinon.stub($rootScope, '$on').returns(unbind);
        $route.reload = sinon.stub();

        expect($rootScope.$on.callCount).to.be(0);
        kbnUrl.change('/url');
        expect($rootScope.$on.callCount).to.be(1);

        var handler = $rootScope.$on.firstCall.args[1];
        handler();
        expect(unbind.callCount).to.be(1);
        expect($route.reload.callCount).to.be(1);
      });

      it('reloads requested before the first are ignored', function () {
        $location.url('/url');
        $route.current = {
          $$route: {
            regex: /.*/
          }
        };
        $route.reload = sinon.stub();

        sinon.stub($rootScope, '$on').returns(sinon.stub());

        expect($rootScope.$on.callCount).to.be(0);
        kbnUrl.change('/url');
        expect($rootScope.$on.callCount).to.be(1);

        // don't call the first handler

        kbnUrl.change('/url');
        expect($rootScope.$on.callCount).to.be(1);
      });

      it('one reload can happen once the first has completed', function () {
        $location.url('/url');
        $route.current = {
          $$route: {
            regex: /.*/
          }
        };
        $route.reload = sinon.stub();

        sinon.stub($rootScope, '$on').returns(sinon.stub());

        expect($rootScope.$on.callCount).to.be(0);
        kbnUrl.change('/url');
        expect($rootScope.$on.callCount).to.be(1);

        // call the first handler
        $rootScope.$on.firstCall.args[1]();
        expect($route.reload.callCount).to.be(1);

        expect($rootScope.$on.callCount).to.be(1);
        kbnUrl.change('/url');
        expect($rootScope.$on.callCount).to.be(2);
      });
    });

    describe('change', function () {
      it('should set $location.url', function () {
        sinon.stub($location, 'url');

        expect($location.url.callCount).to.be(0);
        kbnUrl.change('/some-url');
        expect($location.url.callCount).to.be(1);
      });

      it('should uri encode replaced params', function () {
        var url = '/some/path/';
        var params = { replace: faker.Lorem.words(3).join(' ') };
        var check = encodeURIComponent(params.replace);
        sinon.stub($location, 'url');

        kbnUrl.change(url + '{{replace}}', params);

        expect($location.url.firstCall.args[0]).to.be(url + check);
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

        sinon.stub($location, 'url');

        kbnUrl.change(url, params);

        expect($location.url.firstCall.args[0]).to.not.be(url);
        expect($location.url.firstCall.args[0]).to.be(testUrl);
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
    });

    describe('shouldAutoReload', function () {
      var next;
      var prev;

      beforeEach(function () {
        $route.current = {
          $$route: {
            regexp: /^\/is-current-route\/(\d+)/,
            reloadOnSearch: true
          }
        };

        prev = { path: '/is-current-route/1', search: {} };
        next = { path: '/is-current-route/1', search: {} };
      });

      it('returns false if the passed url doesn\'t match the current route', function () {
        next.path = '/not current';
        expect(kbnUrl.shouldAutoReload(next, prev)).to.be(false);
      });

      describe('if the passed url does match the route', function () {
        describe('and the route reloads on search', function () {
          describe('and the path is the same', function () {
            describe('and the search params are the same', function () {
              it('returns true', function () {
                expect(kbnUrl.shouldAutoReload(next, prev)).to.be(true);
              });
            });
            describe('but the search params are different', function () {
              it('returns false', function () {
                next.search = {};
                prev.search = { q: 'search term' };
                expect(kbnUrl.shouldAutoReload(next, prev)).to.be(false);
              });
            });
          });

          describe('and the path is different', function () {
            beforeEach(function () {
              next.path = '/not-same';
            });

            describe('and the search params are the same', function () {
              it('returns false', function () {
                expect(kbnUrl.shouldAutoReload(next, prev)).to.be(false);
              });
            });
            describe('but the search params are different', function () {
              it('returns false', function () {
                next.search = {};
                prev.search = { q: 'search term' };
                expect(kbnUrl.shouldAutoReload(next, prev)).to.be(false);
              });
            });
          });
        });

        describe('but the route does not reload on search', function () {
          beforeEach(function () {
            $route.current.$$route.reloadOnSearch = false;
          });

          describe('and the path is the same', function () {
            describe('and the search params are the same', function () {
              it('returns true', function () {
                expect(kbnUrl.shouldAutoReload(next, prev)).to.be(true);
              });
            });
            describe('but the search params are different', function () {
              it('returns true', function () {
                next.search = {};
                prev.search = { q: 'search term' };
                expect(kbnUrl.shouldAutoReload(next, prev)).to.be(true);
              });
            });
          });

          describe('and the path is different', function () {
            beforeEach(function () {
              next.path = '/not-same';
            });

            describe('and the search params are the same', function () {
              it('returns false', function () {
                expect(kbnUrl.shouldAutoReload(next, prev)).to.be(false);
              });
            });
            describe('but the search params are different', function () {
              it('returns false', function () {
                next.search = {};
                prev.search = { q: 'search term' };
                expect(kbnUrl.shouldAutoReload(next, prev)).to.be(false);
              });
            });
          });
        });
      });
    });
  });
});