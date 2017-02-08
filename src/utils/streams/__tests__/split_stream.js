import expect from 'expect.js';

import {
  createSplitStream,
  createConcatStream,
  createPromiseFromStreams,
} from '../';

async function split(stream, input) {
  const concat = createConcatStream();
  concat.write([]);
  stream.pipe(concat);
  const output = createPromiseFromStreams([concat]);

  input.forEach(i => {
    stream.write(i);
  });
  stream.end();

  return await output;
}

describe('splitStream', () => {
  it('splits buffers, produces strings', async () => {
    const output = await split(createSplitStream('&'), [Buffer.from('foo&bar')]);
    expect(output).to.eql(['foo', 'bar']);
  });

  it('supports mixed input', async () => {
    const output = await split(createSplitStream('&'), [Buffer.from('foo&b'), 'ar']);
    expect(output).to.eql(['foo', 'bar']);
  });

  it('supports buffer split chunks', async () => {
    const output = await split(createSplitStream(Buffer.from('&')), ['foo&b', 'ar']);
    expect(output).to.eql(['foo', 'bar']);
  });

  it('splits provided values by a delimiter', async () => {
    const output = await split(createSplitStream('&'), ['foo&b', 'ar']);
    expect(output).to.eql(['foo', 'bar']);
  });

  it('handles multi-character delimiters', async () => {
    const output = await split(createSplitStream('oo'), ['foo&b', 'ar']);
    expect(output).to.eql(['f', '&bar']);
  });

  it('handles delimiters that span multple chunks', async () => {
    const output = await split(createSplitStream('ba'), ['foo&b', 'ar']);
    expect(output).to.eql(['foo&', 'r']);
  });

  it('produces an empty chunk if the split char is at the end of the input', async () => {
    const output = await split(createSplitStream('&bar'), ['foo&b', 'ar']);
    expect(output).to.eql(['foo', '']);
  });
});
