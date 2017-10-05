import sinon from 'sinon';

export function assertSinonMatch(value, match) {
  const stub = sinon.stub();
  stub(value);
  sinon.assert.calledWithExactly(stub, match);
}

export function assertServiceUnavailableResponse({ result }) {
  assertSinonMatch(result, {
    statusCode: 503,
    error: 'Service Unavailable',
    message: 'Service Unavailable'
  });
}
