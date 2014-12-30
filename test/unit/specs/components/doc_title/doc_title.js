define(function (require) {
  describe('docTitle Service', function () {
    var _ = require('lodash');
    var sinon = require('test_utils/auto_release_sinon');
    var initialDocTitle;
    var MAIN_TITLE = 'Kibana 4';
    var fakeApp = { name: 'fancy pants' };

    var docTitle;
    var $rootScope;

    beforeEach(function () {
      initialDocTitle = document.title;
      document.title = MAIN_TITLE;
    });
    afterEach(function () {
      document.title = initialDocTitle;
    });

    beforeEach(module('kibana', function ($provide) {
      $provide.decorator('docTitle', sinon.decorateWithSpy('update'));
      $provide.decorator('$rootScope', sinon.decorateWithSpy('$on'));
    }));

    beforeEach(inject(function ($injector, Private) {
      if (_.random(0, 1)) {
        docTitle = $injector.get('docTitle');
      } else {
        docTitle = Private(require('components/doc_title/doc_title'));
      }

      $rootScope = $injector.get('$rootScope');
    }));

    describe('setup', function () {
      it('resets the title when a route change begins', function () {
        var spy = $rootScope.$on;

        var found = spy.args.some(function (args) {
          return args[0] === '$routeChangeStart' && args[1] === docTitle.reset;
        });

        if (!found) {
          throw new Error('$rootScope.$on not called');
        }
      });
    });

    describe('#reset', function () {
      it('clears the internal state, next update() will write the default', function () {
        docTitle.change('some title');
        docTitle.update();
        expect(document.title).to.be('some title - ' + MAIN_TITLE);

        docTitle.reset();
        docTitle.update();
        expect(document.title).to.be(MAIN_TITLE);
      });
    });

    describe('#change', function () {
      it('writes the first param to as the first part of the doc name', function () {
        expect(document.title).to.be(MAIN_TITLE);
        docTitle.change('some secondary title');
        expect(document.title).to.be('some secondary title - ' + MAIN_TITLE);
      });

      it('includes the name of the active app if available', function () {
        expect(document.title).to.be(MAIN_TITLE);
        $rootScope.activeApp = fakeApp;
        docTitle.change('some secondary title');
        expect(document.title).to.be('some secondary title - ' + fakeApp.name + ' - ' + MAIN_TITLE);
      });

      it('will write just the first param if the second param is true', function () {
        expect(document.title).to.be(MAIN_TITLE);
        docTitle.change('entire name', true);
        expect(document.title).to.be('entire name');
      });
    });

  });
});