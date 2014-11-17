define(function (require) {
  describe('docTitle Service', function () {
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
      $provide.decorator('docTitle', sinon.decorateWithSpy('ensureAppName'));
      $provide.decorator('$rootScope', sinon.decorateWithSpy('$on'));
    }));

    beforeEach(inject(function ($injector) {
      docTitle = $injector.get('docTitle');
      $rootScope = $injector.get('$rootScope');
    }));

    describe('setup', function () {
      it('resets the title when a route change begins', function () {
        var call;
        var spy = $rootScope.$on;
        for (var i = 0; i < spy.callCount; i++) {
          if (spy.args[i][0] === '$routeChangeStart') {
            call = spy.getCall(i);
            break;
          }
        }

        if (!call) throw new Error('$rootScope.$on not called');

        expect(call.args[0]).to.be('$routeChangeStart');
        expect(call.args[1]).to.be(docTitle.reset);
      });
    });

    describe('#reset', function () {
      it('sets the page title to whatever it was when kibana bootup', function () {
        document.title = 'not ' + MAIN_TITLE;
        docTitle.reset();
        expect(document.title).to.be(MAIN_TITLE);
      });
    });

    describe('#ensureAppName', function () {
      it('triggered when active app changes, sets the page title to include the app name', function () {
        expect(document.title).to.be(MAIN_TITLE);
        expect(docTitle.ensureAppName).to.have.property('callCount', 0);

        $rootScope.activeApp = fakeApp;
        $rootScope.$apply();

        expect(docTitle.ensureAppName).to.have.property('callCount', 1);
        expect(document.title).to.be(fakeApp.name + ' - ' + MAIN_TITLE);
      });

      it('does nothing if the document.title has been modified', function () {
        var changed = document.title = 'not the basic title';
        expect(docTitle.ensureAppName).to.have.property('callCount', 0);

        $rootScope.activeApp = fakeApp;
        $rootScope.$apply();

        expect(docTitle.ensureAppName).to.have.property('callCount', 1);
        expect(document.title).to.be(changed);
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