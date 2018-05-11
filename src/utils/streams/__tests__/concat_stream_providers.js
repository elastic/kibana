import { Readable } from 'stream';

import sinon from 'sinon';
import expect from 'expect.js';

import { concatStreamProviders } from '../concat_stream_providers';
import { createListStream } from '../list_stream';
import { createConcatStream } from '../concat_stream';
import { createPromiseFromStreams } from '../promise_from_streams';

describe('concatStreamProviders() helper', () => {
  it('writes the data from an array of stream providers into a destination stream in order', async () => {
    const results = await createPromiseFromStreams([
      concatStreamProviders([
        () => createListStream([
          'foo',
          'bar'
        ]),
        () => createListStream([
          'baz',
        ]),
        () => createListStream([
          'bug',
        ]),
      ]),
      createConcatStream('')
    ]);

    expect(results).to.be('foobarbazbug');
  });

  it('emits the errors from a sub-stream to the destination', async () => {
    const dest = concatStreamProviders([
      () => createListStream([
        'foo',
        'bar'
      ]),
      () => new Readable({
        read() {
          this.emit('error', new Error('foo'));
        }
      }),
    ]);

    const errorListener = sinon.stub();
    dest.on('error', errorListener);

    try {
      await createPromiseFromStreams([dest]);
      throw new Error('Expected createPromiseFromStreams() to reject with error');
    } catch (error) {
      expect(error).to.have.property('message', 'foo');
    }

    sinon.assert.calledOnce(errorListener);
    sinon.assert.calledWithExactly(errorListener, sinon.match({
      message: 'foo'
    }));
  });
});
