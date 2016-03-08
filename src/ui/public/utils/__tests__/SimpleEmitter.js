import SimpleEmitter from 'ui/utils/SimpleEmitter';
import BaseObject from 'ui/utils/BaseObject';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';
describe('SimpleEmitter class', function () {
  var emitter;

  beforeEach(function () {
    emitter = new SimpleEmitter();
  });

  it('constructs an event emitter', function () {
    expect(emitter).to.have.property('on');
    expect(emitter).to.have.property('off');
    expect(emitter).to.have.property('emit');
    expect(emitter).to.have.property('listenerCount');
    expect(emitter).to.have.property('removeAllListeners');
  });

  it('extends base object', function () {
    expect(emitter).to.be.a(BaseObject);
  });
});
