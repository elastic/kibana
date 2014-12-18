define(function (require) {
  describe('Private module loader', function () {

    var Private;

    beforeEach(module('kibana'));
    beforeEach(inject(function ($injector) {
      Private = $injector.get('Private');
    }));

    it('accepts a provider that will be called to init a module', function () {
      var football = {};
      function Provider() {
        return football;
      }

      var instance = Private(Provider);
      expect(instance).to.be(football);
    });

    it('injects angular dependencies into the Provider', function () {
      function Provider(Private) {
        return Private;
      }

      var instance = Private(Provider);
      expect(instance).to.be(Private);
    });

    it('detects circular dependencies', function () {
      expect(function () {
        function Provider1() {
          var p3 = Private(Provider3);
        }

        function Provider2() {
          var p3 = Private(Provider3);
        }

        function Provider3() {
          var p1 = Private(Provider3);
        }

        var p1 = Private(Provider1);
      }).to.throwException(/circular/i);
    });

    it('allways provides the same instance form the Provider', function () {
      function Provider() {
        return {};
      }

      expect(Private(Provider)).to.be(Private(Provider));
    });

    describe('#stub', function () {
      it('accepts a replacement instance for a Provider', function () {
        var replaced = {};
        var replacement = {};

        function Provider() {
          return replaced;
        }

        var instance = Private(Provider);
        expect(instance).to.be(replaced);

        Private.stub(Provider, replacement);

        var instance2 = Private(Provider);
        expect(instance2).to.be(replacement);

        Private.stub(Provider, replaced);

        var instance3 = Private(Provider);
        expect(instance3).to.be(replaced);
      });
    });

    describe('#swap', function () {
      it('accepts a new Provider that should replace an existing Provider', function () {
        function Provider1() {
          return {};
        }

        function Provider2() {
          return {};
        }

        var instance1 = Private(Provider1);
        expect(instance1).to.be.an('object');

        Private.swap(Provider1, Provider2);

        var instance2 = Private(Provider1);
        expect(instance2).to.be.an('object');
        expect(instance2).to.not.be(instance1);

        Private.swap(Provider1, Provider1);

        var instance3 = Private(Provider1);
        expect(instance3).to.be(instance1);
      });
    });
  });
});