import sinon from 'sinon';
import expect from 'expect.js';
import Chance from 'chance';

import { UiApp } from '../ui_app';
import { UiNavLink } from '../../ui_nav_links';

const chance = new Chance();

function createStubUiAppSpec(extraParams) {
  return {
    id: 'uiapp-test',
    main: 'main.js',
    title: 'UIApp Test',
    order: 9000,
    description: 'Test of UI App Constructor',
    icon: 'ui_app_test.svg',
    linkToLastSubUrl: true,
    hidden: false,
    listed: false,
    templateName: 'ui_app_test',
    uses: [
      'visTypes',
      'chromeNavControls',
      'hacks',
    ],
    injectVars() {
      return { foo: 'bar' };
    },
    ...extraParams
  };
}

function createStubKbnServer() {
  return {
    plugins: [],
    uiExports: {
      appExtensions: {
        hacks: [
          'plugins/foo/hack'
        ]
      }
    },
    config: {
      get: sinon.stub()
        .withArgs('server.basePath')
        .returns('')
    },
    server: {}
  };
}

function createUiApp(spec = createStubUiAppSpec(), kbnServer = createStubKbnServer()) {
  return new UiApp(kbnServer, spec);
}

describe('ui apps / UiApp', () => {
  describe('constructor', () => {
    it('throws an exception if an ID is not given', () => {
      const spec = {}; // should have id property
      expect(() => createUiApp(spec)).to.throwException();
    });

    describe('defaults', () => {
      const spec = { id: 'uiapp-test-defaults' };
      const app = createUiApp(spec);

      it('has the ID from the spec', () => {
        expect(app.getId()).to.be(spec.id);
      });

      it('has no plugin ID', () => {
        expect(app.getPluginId()).to.be(undefined);
      });

      it('has a default template name of ui_app', () => {
        expect(app.getTemplateName()).to.be('ui_app');
      });

      it('is not hidden', () => {
        expect(app.isHidden()).to.be(false);
      });

      it('is listed', () => {
        expect(app.isListed()).to.be(true);
      });

      it('has a navLink', () => {
        expect(app.getNavLink()).to.be.a(UiNavLink);
      });

      it('has no injected vars', () => {
        expect(app.getInjectedVars()).to.be(undefined);
      });

      it('has an empty modules list', () => {
        expect(app.getModules()).to.eql([]);
      });

      it('has a mostly empty JSON representation', () => {
        expect(JSON.parse(JSON.stringify(app))).to.eql({
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

    describe('mock spec', () => {
      const spec = createStubUiAppSpec();
      const app = createUiApp(spec);

      it('has the ID from the spec', () => {
        expect(app.getId()).to.be(spec.id);
      });

      it('has no plugin ID', () => {
        expect(app.getPluginId()).to.be(undefined);
      });

      it('uses the specs template', () => {
        expect(app.getTemplateName()).to.be(spec.templateName);
      });

      it('is not hidden', () => {
        expect(app.isHidden()).to.be(false);
      });

      it('is also not listed', () => {
        expect(app.isListed()).to.be(false);
      });

      it('has no navLink', () => {
        expect(app.getNavLink()).to.be(undefined);
      });

      it('has injected vars', () => {
        expect(app.getInjectedVars()).to.eql({ foo: 'bar' });
      });

      it('includes main and hack modules', () => {
        expect(app.getModules()).to.eql([
          'main.js',
          'plugins/foo/hack'
        ]);
      });

      it('has spec values in JSON representation', () => {
        expect(JSON.parse(JSON.stringify(app))).to.eql({
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

    /*
     * The "hidden" and "listed" flags have an bound relationship. The "hidden"
     * flag gets cast to a boolean value, and the "listed" flag is dependent on
      * "hidden"
     */
    describe('hidden flag', () => {
      describe('is cast to boolean value', () => {
        it('when undefined', () => {
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isHidden()).to.be(false);
        });

        it('when null', () => {
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: null,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isHidden()).to.be(false);
        });

        it('when 0', () => {
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: 0,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isHidden()).to.be(false);
        });

        it('when true', () => {
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: true,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isHidden()).to.be(true);
        });

        it('when 1', () => {
          const kbnServer = createStubKbnServer();
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
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: true,
            listed: null,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isListed()).to.be(false);
        });

        it(`when it's null and hidden is false`, () => {
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: false,
            listed: null,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isListed()).to.be(true);
        });

        it(`when it's undefined and hidden is false`, () => {
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: false,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isListed()).to.be(true);
        });

        it(`when it's undefined and hidden is true`, () => {
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: true,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isListed()).to.be(false);
        });
      });

      it(`is set to true when it's passed as true`, () => {
        const kbnServer = createStubKbnServer();
        const spec = {
          id: 'uiapp-test',
          listed: true,
        };
        const newApp = new UiApp(kbnServer, spec);
        expect(newApp.isListed()).to.be(true);
      });

      it(`is set to false when it's passed as false`, () => {
        const kbnServer = createStubKbnServer();
        const spec = {
          id: 'uiapp-test',
          listed: false,
        };
        const newApp = new UiApp(kbnServer, spec);
        expect(newApp.isListed()).to.be(false);
      });
    });
  });

  describe('pluginId', () => {
    describe('not specified', () => {
      it('passes the root server and undefined for plugin/optoins to injectVars()', () => {
        const injectVars = sinon.stub();
        const kbnServer = createStubKbnServer();
        createUiApp(createStubUiAppSpec({ injectVars }), kbnServer).getInjectedVars();

        sinon.assert.calledOnce(injectVars);
        sinon.assert.calledOn(injectVars, sinon.match.same(undefined));
        sinon.assert.calledWithExactly(
          injectVars,
          // server arg, uses root server because there is no plugin
          sinon.match.same(kbnServer.server),
          // options is undefined because there is no plugin
          sinon.match.same(undefined)
        );
      });
    });
    describe('matches a kbnServer plugin', () => {
      it('passes the plugin/server/options from the plugin to injectVars()', () => {
        const server = {};
        const options = {};
        const plugin = {
          id: 'test plugin id',
          getServer() {
            return server;
          },
          getOptions() {
            return options;
          }
        };

        const kbnServer = createStubKbnServer();
        kbnServer.plugins.push(plugin);

        const injectVars = sinon.stub();
        const spec = createStubUiAppSpec({ pluginId: plugin.id, injectVars });
        createUiApp(spec, kbnServer).getInjectedVars();

        sinon.assert.calledOnce(injectVars);
        sinon.assert.calledOn(injectVars, sinon.match.same(plugin));
        sinon.assert.calledWithExactly(injectVars, sinon.match.same(server), sinon.match.same(options));
      });
    });
    describe('does not match a kbnServer plugin', () => {
      it('throws an error at instantiation', () => {
        expect(() => {
          createUiApp(createStubUiAppSpec({ pluginId: 'foo' }));
        }).to.throwException((error) => {
          expect(error.message).to.match(/Unknown plugin id/);
        });
      });
    });
  });

  describe('#getModules', () => {
    it('returns empty array by default', () => {
      const app = createUiApp({ id: 'foo' });
      expect(app.getModules()).to.eql([]);
    });

    it('returns main module if not using appExtensions', () => {
      const app = createUiApp({ id: 'foo', main: 'bar' });
      expect(app.getModules()).to.eql(['bar']);
    });

    it('returns appExtensions for used types only, in alphabetical order, starting with main module', () => {
      const kbnServer = createStubKbnServer();
      kbnServer.uiExports.appExtensions = {
        abc: chance.shuffle([
          'a',
          'b',
          'c',
        ]),
        def: chance.shuffle([
          'd',
          'e',
          'f',
        ])
      };

      const appExtensionType = chance.shuffle(Object.keys(kbnServer.uiExports.appExtensions))[0];
      const appSpec = {
        id: 'foo',
        main: 'bar',
        uses: [appExtensionType],
      };

      const app = createUiApp(appSpec, kbnServer);
      expect(app.getModules()).to.eql([
        'bar',
        ...appExtensionType.split(''),
      ]);
    });
  });
});
