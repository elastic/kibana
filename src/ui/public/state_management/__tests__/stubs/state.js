import _ from 'ui/lodash';
import sinon from 'ui/sinon';

export function StubState(defaults) {
  this.on = _.noop;
  this.off = _.noop;
  this.save = sinon.stub();
  this.replace = sinon.stub();
  _.assign(this, defaults);
}
