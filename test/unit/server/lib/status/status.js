var expect = require('expect.js');
var sinon = require('sinon');
var Status = require('../../../../../src/server/lib/status/status');

describe('lib/status/status.js', function () {

  it('should have a red state when initialized', function () {
    var obj = new Status('test');
    expect(obj).to.have.property('state', 'red');
  });

  it('should only trigger the change listner when something changes', function () {
    var obj = new Status('test');
    var stub = sinon.stub();
    obj.on('change', stub);
    obj.green('Ready');
    obj.green('Ready');
    obj.red('Not Ready');
    sinon.assert.calledTwice(stub);
  });

  it('should create a JSON representation of the status', function () {
    var obj = new Status('test');
    obj.green('Ready');
    expect(obj.toJSON()).to.eql({ state: 'green', message: 'Ready' });
  });

  function testState(color) {
    it('should change the state to ' + color + ' when #' + color + '() is called', function () {
      var obj = new Status('test');
      var message = 'testing ' + color;
      obj[color](message);
      expect(obj).to.have.property('state', color);
      expect(obj).to.have.property('message', message);
    });

    it('should trigger the "change" listner when #' + color + '() is called', function (done) {
      var obj = new Status('test');
      var message = 'testing ' + color;
      obj.on('change', function (current, previous) {
        expect(current).to.eql({ state: color, message: message });
        expect(previous).to.eql({ state: 'red', message: '' });
        done();
      });
      obj[color](message);
    });

    it('should trigger the "' + color + '" listner when #' + color + '() is called', function (done) {
      var obj = new Status('test');
      var message = 'testing ' + color;
      obj.on(color, function (msg, prev) {
        expect(msg).to.be(message);
        expect(prev).to.eql({ state: 'red', message: '' });
        done();
      });
      obj[color](message);
    });
  }

  testState('green');
  testState('yellow');
  testState('red');

});
