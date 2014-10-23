define(function (require) {
  describe('Registry', function () {
    var Registry = require('registry/_registry');
    var Private;

    beforeEach(module('kibana'));
    beforeEach(inject(function ($injector) {
      Private = $injector.get('Private');
    }));

    it('is technically a function', function () {
      var reg = new Registry('name');
      expect(reg).to.be.a('function');
    });

    describe('#register', function () {
      it('accepts a Private module', function () {
        var reg = new Registry('name');
        var mod = function SomePrivateModule() {

        };

        reg.register(mod);
        // modules are not exposed, so this is the most that we can test
      });
    });

    describe('as a module', function () {
      it('exposes the list of registered modules', function () {
        var reg = new Registry('name');
        var mod = function SomePrivateModule(Private) {
          this.PrivateModuleLoader = Private;
        };

        reg.register(mod);
        var result = Private(reg);
        expect(result).to.have.length(1);
        expect(result[0]).to.have.property('PrivateModuleLoader', Private);
      });
    });
  });
});