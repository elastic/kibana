import expect from 'expect.js';
import sinon from 'sinon';

import {
  createPromiseFromStreams,
  createListStream,
  createIntersperseStream,
  createConcatStream
} from '../';

describe('intersperseStream', () => {
  it('places the intersperse value between each provided value', async () => {
    expect(
      await createPromiseFromStreams([
        createListStream(['to', 'be', 'or', 'not', 'to', 'be']),
        createIntersperseStream(' '),
        createConcatStream()
      ])
    ).to.be('to be or not to be');
  });

  it('emits values as soon as possible, does not needlessly buffer', async () => {
    const str = createIntersperseStream('y');
    const stub = sinon.stub();
    str.on('data', stub);

    str.write('a');
    sinon.assert.calledOnce(stub);
    expect(stub.firstCall.args).to.eql(['a']);
    stub.reset();

    str.write('b');
    sinon.assert.calledTwice(stub);
    expect(stub.firstCall.args).to.eql(['y']);
    sinon.assert.calledTwice(stub);
    expect(stub.secondCall.args).to.eql(['b']);
  });
});
