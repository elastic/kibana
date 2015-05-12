var _ = require('lodash');
var expect = require('expect.js');
var sinon = require('sinon');
var registerPlugins = require('../../../../../src/server/lib/plugins/register_plugins');
var Status = require('../../../../../src/server/lib/status/status');
var systemStatus = require('../../../../../src/server/lib/status');
var Promise = require('bluebird');

function createInit() {
  return sinon.stub().returns(Promise.resolve());
}

describe('server/lib/register_plugins', function () {
  var server, get;

  beforeEach(function () {
    get = sinon.stub();
    server = {
      register: sinon.stub(),
      config: sinon.stub().returns({ get: get }),
      expose: sinon.stub(),
      log: sinon.stub()
    };
  });

  describe('registerPlugins() wrapper', function () {

    var options = { foo: 'bar' };

    it('should pass server, options and next to the init function', function () {
      var next = function (err) {
        server.register.args[0][1](err);
      };
      server.register.yieldsTo('register', server, options, next);
      var plugin = { name: 'first', init: createInit() };
      var plugins = [plugin];
      return registerPlugins(server, plugins).then(function () {
        expect(plugin.init.args[0][0]).to.equal(server);
        expect(plugin.init.args[0][1]).to.equal(options);
      });
    });

    it('should call next() when plugin.init completes', function () {
      var called = false;
      var next = function (err) {
        called = true;
        server.register.args[0][1](err);
      };
      server.register.yieldsTo('register', server, options, next);
      var plugin = { name: 'first', init: createInit() };
      var plugins = [plugin];
      return registerPlugins(server, plugins).then(function () {
        expect(called).to.be(true);
      });
    });

    it('should attach the server to the plugin', function () {
      var next = function (err) {
        server.register.args[0][1](err);
      };
      server.register.yieldsTo('register', server, options, next);
      var plugin = { name: 'first', init: createInit() };
      var plugins = [plugin];
      return registerPlugins(server, plugins).then(function () {
        expect(plugin).to.have.property('server');
        expect(plugin.server).to.eql(server);
      });
    });

    var greenSpy, yellowSpy, createStatus;
    beforeEach(function () {
      greenSpy = sinon.spy(Status.prototype, 'green');
      yellowSpy = sinon.spy(Status.prototype, 'yellow');
      createStatus = sinon.spy(systemStatus, 'createStatus');
    });

    afterEach(function () {
      Status.prototype.green.restore();
      Status.prototype.yellow.restore();
      systemStatus.createStatus.restore();
    });

    it('should call status.createStatus() with plugin', function () {
      var next = function (err) {
        server.register.args[0][1](err);
      };
      server.register.yieldsTo('register', server, options, next);
      var plugin = { name: 'first', init: createInit() };
      var plugins = [plugin];
      return registerPlugins(server, plugins).then(function () {
        sinon.assert.calledOnce(createStatus);
        expect(plugin).to.have.property('status');
        expect(createStatus.args[0][0]).to.eql(plugin);
      });
    });
    it('should set the status to yellow and "Initializing" before init is called', function () {
      var next = function (err) {
        server.register.args[0][1](err);
      };
      server.register.yieldsTo('register', server, options, next);
      var plugin = { name: 'first', init: createInit() };
      var plugins = [plugin];
      return registerPlugins(server, plugins).then(function () {
        sinon.assert.calledOnce(yellowSpy);
        expect(plugin.init.calledAfter(yellowSpy)).to.be(true);
        expect(yellowSpy.args[0][0]).to.be('Initializing');
      });
    });

    it('should set the status to green and "Ready" after init', function () {
      var next = function (err) {
        server.register.args[0][1](err);
      };
      server.register.yieldsTo('register', server, options, next);
      var plugin = { name: 'first', init: createInit() };
      var plugins = [plugin];
      return registerPlugins(server, plugins).then(function () {
        sinon.assert.calledOnce(greenSpy);
        expect(greenSpy.calledAfter(plugin.init)).to.be(true);
        expect(greenSpy.args[0][0]).to.be('Ready');
      });
    });

  });

  describe('dependencies', function () {
    var nextStub;

    beforeEach(function () {
      var count = 0;
      var next = function (err) {
        server.register.args[count++][1](err);
      };
      server.register.yieldsTo('register', server, {}, next);
    });

    it('should run second after first and third and third after first', function () {
      var first = { name: 'first', init: createInit() };
      var second = { name: 'second', require: ['first', 'third'], init: createInit() };
      var third = { name: 'third', require: ['first'], init: createInit() };
      var plugins = [second, first, third];
      return registerPlugins(server, plugins).then(function () {
        expect(second.init.calledAfter(first.init)).to.be(true);
        expect(second.init.calledAfter(third.init)).to.be(true);
        expect(third.init.calledAfter(first.init)).to.be(true);
        sinon.assert.calledThrice(server.register);
      });
    });

    it('should run first, second, third', function () {
      var first = { name: 'first', init: createInit() };
      var second = { name: 'second', require: ['first'], init: createInit() };
      var third = { name: 'third', require: ['second'], init: createInit() };
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
