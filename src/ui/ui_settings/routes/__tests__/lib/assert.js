import sinon from 'sinon';

export function assertSinonMatch(value, match) {
  const stub = sinon.stub();
  stub(value);
  sinon.assert.calledWithExactly(stub, match);
}

export function assertGeneric404Response({ result }) {
  assertSinonMatch(result, {
    statusCode: 404,
    error: 'Not Found',
    message: 'Not Found'
  });
}

export function assertServiceUnavailableResponse({ result }) {
  assertSinonMatch(result, {
    statusCode: 503,
    error: 'Service Unavailable',
    message: 'Service Unavailable'
  });
}
