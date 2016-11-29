import expect from 'expect.js';
import ngMock from 'ng_mock';

describe('Private module loader', function () {

  let Private;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    Private = $injector.get('Private');
  }));

  it('accepts a provider that will be called to init a module', function () {
    let football = {};
    function Provider() {
      return football;
    }

    let instance = Private(Provider);
    expect(instance).to.be(football);
  });

  it('injects angular dependencies into the Provider', function () {
    function Provider(Private) {
      return Private;
    }

    let instance = Private(Provider);
    expect(instance).to.be(Private);
  });

  it('detects circular dependencies', function () {
    expect(function () {
      function Provider1() {
        let p3 = Private(Provider3);
      }

      function Provider2() {
        let p3 = Private(Provider3);
      }

      function Provider3() {
        let p1 = Private(Provider3);
      }

      let p1 = Private(Provider1);
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
      let replaced = {};
      let replacement = {};

      function Provider() {
        return replaced;
      }

      let instance = Private(Provider);
      expect(instance).to.be(replaced);

      Private.stub(Provider, replacement);

      let instance2 = Private(Provider);
      expect(instance2).to.be(replacement);

      Private.stub(Provider, replaced);

      let instance3 = Private(Provider);
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

      let instance1 = Private(Provider1);
      expect(instance1).to.be.an('object');

      Private.swap(Provider1, Provider2);

      let instance2 = Private(Provider1);
      expect(instance2).to.be.an('object');
      expect(instance2).to.not.be(instance1);

      Private.swap(Provider1, Provider1);

      let instance3 = Private(Provider1);
      expect(instance3).to.be(instance1);
    });

    it('gives the new Provider access to the Provider it replaced via an injectable dependency called $decorate', function () {
      function Provider1() {
        return {};
      }

      function Provider2($decorate) {
        return {
          instance1: $decorate()
        };
      }

      let instance1 = Private(Provider1);
      expect(instance1).to.be.an('object');

      Private.swap(Provider1, Provider2);

      let instance2 = Private(Provider1);
      expect(instance2).to.have.property('instance1');
      expect(instance2.instance1).to.be(instance1);
    });
  });
});
