var expect = require('expect.js');
var Plugin = require('../../../../../src/server/lib/plugins/plugin');

describe('lib/plugins/plugin', function () {

  it('should assign attributes passed into the created to the object', function () {
    var plugin = new Plugin({ name: 'test', require: ['config'] });
    expect(plugin).to.have.property('name', 'test');
    expect(plugin).to.have.property('require');
    expect(plugin.require).to.eql(['config']);
  });

  it('should by default assign an empty array to the require attribute', function () {
    var plugin = new Plugin();
    expect(plugin).to.have.property('require');
    expect(plugin.require).to.eql([]);
  });

  it('should by default assign a function to init attribute that rejects a promise', function (done) {
    var plugin = new Plugin();
    expect(plugin).to.have.property('init');
    plugin.init().catch(function (err) {
      expect(err.message).to.be('You must override the init function for plugins');
      done();
    });
  });

});
