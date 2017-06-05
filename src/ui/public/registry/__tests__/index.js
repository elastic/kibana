import { uiRegistry } from 'ui/registry/_registry';
import expect from 'expect.js';
import ngMock from 'ng_mock';

describe('Registry', function () {
  let Private;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    Private = $injector.get('Private');
  }));

  it('is technically a function', function () {
    const reg = uiRegistry();
    expect(reg).to.be.a('function');
  });

  describe('#register', function () {
    it('accepts a Private module', function () {
      const reg = uiRegistry();
      const mod = function SomePrivateModule() {};

      reg.register(mod);
      // modules are not exposed, so this is the most that we can test
    });
  });

  describe('as a module', function () {
    it('exposes the list of registered modules', function () {
      const reg = uiRegistry();
      const mod = function SomePrivateModule(Private) {
        this.PrivateModuleLoader = Private;
      };

      reg.register(mod);
      const modules = Private(reg);
      expect(modules).to.have.length(1);
      expect(modules[0]).to.have.property('PrivateModuleLoader', Private);
    });
  });

  describe('spec', function () {
    it('executes with the module list as "this", and can override it', function () {
      let self;

      const reg = uiRegistry({
        constructor: function () {
          return { mods: (self = this) };
        }
      });

      const modules = Private(reg);
      expect(modules).to.be.an('object');
      expect(modules).to.have.property('mods', self);
    });
  });

  describe('spec.name', function () {
    it('sets the displayName of the registry and the name param on the final instance', function () {
      const reg = uiRegistry({
        name: 'visTypes'
      });

      expect(reg).to.have.property('displayName', '[registry visTypes]');
      expect(Private(reg)).to.have.property('name', 'visTypes');
    });
  });

  describe('spec.constructor', function () {
    it('executes before the modules are returned', function () {
      let i = 0;

      const reg = uiRegistry({
        constructor: function () {
          i = i + 1;
        }
      });

      Private(reg);
      expect(i).to.be(1);
    });

    it('executes with the module list as "this", and can override it', function () {
      let self;

      const reg = uiRegistry({
        constructor: function () {
          return { mods: (self = this) };
        }
      });

      const modules = Private(reg);
      expect(modules).to.be.an('object');
      expect(modules).to.have.property('mods', self);
    });
  });

  describe('spec[any]', function () {
    it('mixes the extra properties into the module list', function () {
      const reg = uiRegistry({
        someMethod: function () {
          return this;
        }
      });

      const modules = Private(reg);
      expect(modules).to.have.property('someMethod');
      expect(modules.someMethod()).to.be(modules);
    });
  });
});
