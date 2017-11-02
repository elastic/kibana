import sinon from 'sinon';
import expect from 'expect.js';

import { UiApp } from '../ui_app';

function getMockSpec(extraParams) {
  return {
    id: 'uiapp-test',
    main: 'main.js',
    title: 'UIApp Test',
    order: 9000,
    description: 'Test of UI App Constructor',
    icon: 'ui_app_test.svg',
    linkToLastSubUrl: true,
    hidden: false,
    listed: null,
    templateName: 'ui_app_test',
    ...extraParams
  };
}

function getMockKbnServer() {
  return {
    plugins: [],
    uiExports: {},
    config: {
      get: sinon.stub()
        .withArgs('server.basePath')
        .returns('')
    }
  };
}

describe('UiApp', () => {
  describe('constructor', () => {
    it('throws an exception if an ID is not given', () => {
      function newAppMissingID() {
        const spec = {}; // should have id property
        const kbnServer = getMockKbnServer();
        const newApp = new UiApp(kbnServer, spec);
        return newApp;
      }
      expect(newAppMissingID).to.throwException();
    });

    describe('defaults', () => {
      const spec = { id: 'uiapp-test-defaults' };
      const kbnServer = getMockKbnServer();
      let newApp;
      beforeEach(() => {
        newApp = new UiApp(kbnServer, spec);
      });

      it('has the ID from the spec', () => {
        expect(newApp.getId()).to.be(spec.id);
      });

      it('has a navLink', () => {
        expect(!!newApp.getNavLink()).to.be(true);
      });

      it('has a default template name of ui_app', () => {
        expect(newApp.getTemplateName()).to.be('ui_app');
      });

      describe('uiApp.getInjectedVars()', () => {
        it('returns undefined by default', () => {
          expect(newApp.getInjectedVars()).to.be(undefined);
        });
      });

      describe('JSON representation', () => {
        it('has defaults', () => {
          expect(JSON.parse(JSON.stringify(newApp))).to.eql({
            id: spec.id,
            navLink: {
              id: 'uiapp-test-defaults',
              order: 0,
              url: '/app/uiapp-test-defaults',
              subUrlBase: '/app/uiapp-test-defaults',
              linkToLastSubUrl: true,
              hidden: false,
              disabled: false,
              tooltip: ''
            },
          });
        });
      });
    });

    describe('mock spec', () => {
      describe('JSON representation', () => {
        it('has defaults and values from spec', () => {
          const kbnServer = getMockKbnServer();
          const spec = getMockSpec();
          const uiApp = new UiApp(kbnServer, spec);

          expect(JSON.parse(JSON.stringify(uiApp))).to.eql({
            id: spec.id,
            title: spec.title,
            description: spec.description,
            icon: spec.icon,
            main: spec.main,
            linkToLastSubUrl: spec.linkToLastSubUrl,
            navLink: {
              id: 'uiapp-test',
              title: 'UIApp Test',
              order: 9000,
              url: '/app/uiapp-test',
              subUrlBase: '/app/uiapp-test',
              description: 'Test of UI App Constructor',
              icon: 'ui_app_test.svg',
              linkToLastSubUrl: true,
              hidden: false,
              disabled: false,
              tooltip: ''
            },
          });
        });
      });
    });

    /*
     * The "hidden" and "listed" flags have an bound relationship. The "hidden"
     * flag gets cast to a boolean value, and the "listed" flag is dependent on
      * "hidden"
     */
    describe('hidden flag', () => {
      describe('is cast to boolean value', () => {
        it('when undefined', () => {
          const kbnServer = getMockKbnServer();
          const spec = {
            id: 'uiapp-test',
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isHidden()).to.be(false);
        });

        it('when null', () => {
          const kbnServer = getMockKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: null,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isHidden()).to.be(false);
        });

        it('when 0', () => {
          const kbnServer = getMockKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: 0,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isHidden()).to.be(false);
        });

        it('when true', () => {
          const kbnServer = getMockKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: true,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isHidden()).to.be(true);
        });

        it('when 1', () => {
          const kbnServer = getMockKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: 1,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isHidden()).to.be(true);
        });
      });
    });

    describe('listed flag', () => {
      describe('defaults to the opposite value of hidden', () => {
        it(`when it's null and hidden is true`, () => {
          const kbnServer = getMockKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: true,
            listed: null,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isListed()).to.be(false);
        });

        it(`when it's null and hidden is false`, () => {
          const kbnServer = getMockKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: false,
            listed: null,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isListed()).to.be(true);
        });

        it(`when it's undefined and hidden is false`, () => {
          const kbnServer = getMockKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: false,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isListed()).to.be(true);
        });

        it(`when it's undefined and hidden is true`, () => {
          const kbnServer = getMockKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: true,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isListed()).to.be(false);
        });
      });

      it(`is set to true when it's passed as true`, () => {
        const kbnServer = getMockKbnServer();
        const spec = {
          id: 'uiapp-test',
          listed: true,
        };
        const newApp = new UiApp(kbnServer, spec);
        expect(newApp.isListed()).to.be(true);
      });

      it(`is set to false when it's passed as false`, () => {
        const kbnServer = getMockKbnServer();
        const spec = {
          id: 'uiapp-test',
          listed: false,
        };
        const newApp = new UiApp(kbnServer, spec);
        expect(newApp.isListed()).to.be(false);
      });
    });
  });

  describe('getModules', () => {
    it('gets modules from kbnServer', () => {
      const spec = getMockSpec();
      const kbnServer = {
        ...getMockKbnServer(),
        uiExports: {
          appExtensions: {
            chromeNavControls: [ 'plugins/ui_app_test/views/nav_control' ],
            hacks: [ 'plugins/ui_app_test/hacks/init' ]
          }
        }
      };

      const newApp = new UiApp(kbnServer, spec);
      expect(newApp.getModules()).to.eql([
        'main.js',
        'plugins/ui_app_test/views/nav_control',
        'plugins/ui_app_test/hacks/init'
      ]);
    });
  });
});
