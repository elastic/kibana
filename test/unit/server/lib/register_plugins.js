var expect = require('expect.js');
var sinon = require('sinon');
var registerPlugins = require('../../../../src/hapi/lib/register_plugins');
var Promise = require('bluebird');

describe('server/lib/register_plugins', function () {

  describe('registerPlugins() wrapper', function () {

    it('should pass server, options and next to the init function', function () {
      var options = { foo: 'bar' };
      var server = { register: sinon.stub() };
      var next = function (err) {
        server.register.args[0][1](err);
      };
      server.register.yieldsTo('register', [server, options, next]);
      var plugin = { name: 'first', init: sinon.stub().yields() };
      var plugins = [plugin];
      return registerPlugins(server, plugins).then(function () {
        expect(plugin.init.args[0][0]).to.equal(server);
        expect(plugin.init.args[0][1]).to.equal(options);
        expect(plugin.init.args[0][2]).to.equal(next);
      });
    });

    it('should call next() when plugin.init completes', function () {
      var called = false;
      var options = { foo: 'bar' };
      var server = { register: sinon.stub() };
      var next = function (err) {
        called = true;
        server.register.args[0][1](err);
      };
      server.register.yieldsTo('register', [server, options, next]);
      var plugin = { name: 'first', init: sinon.stub().yields() };
      var plugins = [plugin];
      return registerPlugins(server, plugins).then(function () {
        expect(called).to.be(true);
      });
    });

  });

  describe('dependencies', function () {
    var server, nextStub;

    beforeEach(function () {
      server = { register: sinon.stub() };
      var count = 0;
      var next = function (err) {
        server.register.args[count++][1](err);
      };
      server.register.yieldsTo('register', [server, {}, next]);
    });

    it('should run second after first and third and third after first', function () {
      var first = { name: 'first', init: sinon.stub().yields() };
      var second = { name: 'second', require: ['first', 'third'], init: sinon.stub().yields() };
      var third = { name: 'third', require: ['first'], init: sinon.stub().yields() };
      var plugins = [second, first, third];
      return registerPlugins(server, plugins).then(function () {
        expect(second.init.calledAfter(first.init)).to.be(true);
        expect(second.init.calledAfter(third.init)).to.be(true);
        expect(third.init.calledAfter(first.init)).to.be(true);
        sinon.assert.calledThrice(server.register);
      });
    });

    it('should run first, second, third', function () {
      var first = { name: 'first', init: sinon.stub().yields() };
      var second = { name: 'second', require: ['first'], init: sinon.stub().yields() };
      var third = { name: 'third', require: ['second'], init: sinon.stub().yields() };
      var plugins = [second, first, third];
      return registerPlugins(server, plugins).then(function () {
        sinon.assert.calledOnce(first.init);
        expect(second.init.calledAfter(first.init)).to.be(true);
        expect(third.init.calledAfter(second.init)).to.be(true);
        sinon.assert.calledThrice(server.register);
      });
    });

    it('should detect circular dependencies', function (done) {
      var first = { name: 'first', require: ['third'], init: sinon.stub() };
      var second = { name: 'second', require: ['first'], init: sinon.stub() };
      var third = { name: 'third', require: ['second'], init: sinon.stub() };
      var plugins = [second, first, third];
      registerPlugins(server, plugins).catch(function (err) {
        expect(err).to.be.a(Error);
        expect(err.message).to.be('Circular dependency: second -> first -> third -> second');
        done();
      });
    });

  }); // end dependencies tests

});
