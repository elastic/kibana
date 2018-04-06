import { uiAppsMixin } from './ui_apps_mixin';

jest.mock('./ui_app', () => ({
  UiApp: class StubUiApp {
    constructor(kbnServer, spec) {
      this._id = spec.id;
      this._hidden = !!spec.hidden;
    }
    getId() {
      return this._id;
    }
    isHidden() {
      return this._hidden;
    }
  }
}));

describe('UiAppsMixin', () => {
  let kbnServer;
  let server;

  beforeEach(() => {
    kbnServer = {
      uiExports: {
        uiAppSpecs: [
          {
            id: 'foo',
            hidden: true,
          },
          {
            id: 'bar',
            hidden: false,
          },
        ]
      }
    };

    server = {
      decorate: jest.fn((type, name, value) => {
        if (type !== 'server') {
          return;
        }

        server[name] = value;
      }),
    };

    uiAppsMixin(kbnServer, server);
  });

  it('creates kbnServer.uiApps from uiExports', () => {
    expect(kbnServer.uiApps).toMatchSnapshot();
  });

  it('decorates server with methods', () => {
    expect(server.decorate.mock.calls).toMatchSnapshot();
  });

  describe('server.getAllUiApps()', () => {
    it('returns hidden and non-hidden apps', () => {
      expect(server.getAllUiApps()).toMatchSnapshot();
    });
  });

  describe('server.getUiAppById()', () => {
    it('returns non-hidden apps when requested, undefined for non-hidden and unknown apps', () => {
      expect(server.getUiAppById('foo')).toBe(undefined);
      expect(server.getUiAppById('bar')).toMatchSnapshot();
      expect(server.getUiAppById('baz')).toBe(undefined);
    });
  });

  describe('server.getHiddenUiAppById()', () => {
    it('returns hidden apps when requested, undefined for non-hidden and unknown apps', () => {
      expect(server.getHiddenUiAppById('foo')).toMatchSnapshot();
      expect(server.getHiddenUiAppById('bar')).toBe(undefined);
      expect(server.getHiddenUiAppById('baz')).toBe(undefined);
    });
  });

  describe('server.injectUiAppVars()/server.getInjectedUiAppVars()', () => {
    it('stored injectVars provider and returns provider result when requested', async () => {

      server.injectUiAppVars('foo', () => ({
        thisIsFoo: true
      }));

      server.injectUiAppVars('bar', async () => ({
        thisIsFoo: false
      }));

      await expect(server.getInjectedUiAppVars('foo')).resolves.toMatchSnapshot('foo');
      await expect(server.getInjectedUiAppVars('bar')).resolves.toMatchSnapshot('bar');
      await expect(server.getInjectedUiAppVars('baz')).resolves.toEqual({});
    });

    it('merges injected vars provided by multiple providers in the order they are registered', async () => {
      server.injectUiAppVars('foo', () => ({
        foo: true,
        bar: true,
        baz: true,
      }));

      server.injectUiAppVars('foo', async () => ({
        bar: false,
        box: true
      }));

      server.injectUiAppVars('foo', async () => ({
        baz: 1,
      }));

      await expect(server.getInjectedUiAppVars('foo')).resolves.toMatchSnapshot('foo');
      await expect(server.getInjectedUiAppVars('bar')).resolves.toEqual({});
      await expect(server.getInjectedUiAppVars('baz')).resolves.toEqual({});
    });
  });
});
