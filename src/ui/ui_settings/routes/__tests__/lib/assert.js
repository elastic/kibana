import sinon from 'sinon';

export function assertSinonMatch(value, match) {
  const stub = sinon.stub();
  stub(value);
  sinon.assert.calledWithExactly(stub, match);
}

export function assertDocMissingResponse({ result }) {
  assertSinonMatch(result, {
    statusCode: 404,
    error: 'Not Found',
    message: sinon.match('document_missing_exception')
      .and(sinon.match('document missing'))
  });
}
