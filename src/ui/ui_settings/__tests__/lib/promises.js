import expect from 'expect.js';

export function assertPromise(promise) {
  if (!promise || typeof promise.then !== 'function') {
    throw new Error('Expected function to return a promise');
  }
}

export async function assertRejection(promise, errorMessageContain) {
  assertPromise(promise);

  try {
    await promise;
  } catch (err) {
    expect(err.message).to.contain(errorMessageContain);
  }
}
