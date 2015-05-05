var expect = require('expect.js');
var sinon = require('sinon');
var logStatusChange = require('../../../../../src/hapi/lib/status/log_status_change');

describe('lib/status/log_status_change', function () {

  var plugin;
  var current = { state: 'yellow', message: 'Initialize' };
  var previous = { state: 'red', message: '' };

  beforeEach(function () {
    plugin = { name: 'test', server: { log: sinon.stub() } };
  });

  it('should call plugin.server.log', function () {
    var fn = logStatusChange(plugin);
    fn(current, previous);
    sinon.assert.calledOnce(plugin.server.log);
  });

  it('should call plugin.server.log with plugin and error message', function () {
    var fn = logStatusChange(plugin);
    fn(current, previous);
    sinon.assert.calledOnce(plugin.server.log);
    expect(plugin.server.log.args[0][0]).to.be('plugin');
    expect(plugin.server.log.args[0][1]).to.be('[ test ] Change status from red to yellow - Initialize');
  });

});
