import sinon from 'sinon';

export function assertSinonMatch(value, match) {
  const stub = sinon.stub();
  stub(value);
  sinon.assert.calledWithExactly(stub, match);
}
