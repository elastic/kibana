import sinon from 'sinon';
import expect from 'expect.js';
import { delay } from 'bluebird';

import { createPromiseFromStreams } from '../promise_from_streams';
import { createListStream } from '../list_stream';
import { createMapStream } from '../map_stream';
import { createConcatStream } from '../concat_stream';

describe('createMapStream()', () => {
  it('calls the function with each item in the source stream', async () => {
    const mapper = sinon.stub();

    await createPromiseFromStreams([
      createListStream([ 'a', 'b', 'c' ]),
      createMapStream(mapper),
    ]);

    sinon.assert.calledThrice(mapper);
    sinon.assert.calledWith(mapper, 'a', 0);
    sinon.assert.calledWith(mapper, 'b', 1);
    sinon.assert.calledWith(mapper, 'c', 2);
  });

  it('send the return value from the mapper on the output stream', async () => {
    const result = await createPromiseFromStreams([
      createListStream([ 1, 2, 3 ]),
      createMapStream(n => n * 100),
      createConcatStream([])
    ]);

    expect(result).to.eql([100, 200, 300]);
  });

  it('supports async mappers', async () => {
    const result = await createPromiseFromStreams([
      createListStream([ 1, 2, 3 ]),
      createMapStream(async (n, i) => {
        await delay(n);
        return n * i;
      }),
      createConcatStream([])
    ]);

    expect(result).to.eql([ 0, 2, 6]);
  });
});
