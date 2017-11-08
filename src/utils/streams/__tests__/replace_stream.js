import expect from 'expect.js';

import {
  createReplaceStream,
  createConcatStream,
  createPromiseFromStreams,
  createListStream,
  createMapStream,
} from '../';

async function concatToString(streams) {
  return await createPromiseFromStreams([
    ...streams,
    createMapStream(buff => buff.toString('utf8')),
    createConcatStream('')
  ]);
}

describe('replaceStream', () => {
  it('produces buffers when it receives buffers', async () => {
    const chunks = await createPromiseFromStreams([
      createListStream([Buffer.from('foo'), Buffer.from('bar')]),
      createReplaceStream('o', '0'),
      createConcatStream([])
    ]);

    chunks.forEach(chunk => {
      expect(chunk).to.be.a(Buffer);
    });
  });

  it('produces buffers when it receives strings', async () => {
    const chunks = await createPromiseFromStreams([
      createListStream(['foo', 'bar']),
      createReplaceStream('o', '0'),
      createConcatStream([])
    ]);

    chunks.forEach(chunk => {
      expect(chunk).to.be.a(Buffer);
    });
  });

  it('expects toReplace to be a string', () => {
    expect(() => createReplaceStream(Buffer.from('foo')))
      .to.throwError(error => {
        expect(error.message).to.match(/be a string/);
      });
  });

  it('replaces multiple single-char instances in a single chunk', async () => {
    expect(await concatToString([
      createListStream([Buffer.from('f00 bar')]),
      createReplaceStream('0', 'o'),
    ])).to.be('foo bar');
  });

  it('replaces multiple single-char instances in multiple chunks', async () => {
    expect(await concatToString([
      createListStream([Buffer.from('f0'), Buffer.from('0 bar')]),
      createReplaceStream('0', 'o'),
    ])).to.be('foo bar');
  });

  it('replaces single multi-char instances in single chunks', async () => {
    expect(await concatToString([
      createListStream([Buffer.from('f0'), Buffer.from('0 bar')]),
      createReplaceStream('0', 'o'),
    ])).to.be('foo bar');
  });

  it('replaces multiple multi-char instances in single chunks', async () => {
    expect(await concatToString([
      createListStream([Buffer.from('foo ba'), Buffer.from('r b'), Buffer.from('az bar')]),
      createReplaceStream('bar', '*'),
    ])).to.be('foo * baz *');
  });

  it('replaces multi-char instance that stretches multiple chunks', async () => {
    expect(await concatToString([
      createListStream([
        Buffer.from('foo supe'),
        Buffer.from('rcalifra'),
        Buffer.from('gilistic'),
        Buffer.from('expialid'),
        Buffer.from('ocious bar'),
      ]),
      createReplaceStream('supercalifragilisticexpialidocious', '*'),
    ])).to.be('foo * bar');
  });

  it('ignores missing multi-char instance', async () => {
    expect(await concatToString([
      createListStream([
        Buffer.from('foo supe'),
        Buffer.from('rcalifra'),
        Buffer.from('gili stic'),
        Buffer.from('expialid'),
        Buffer.from('ocious bar'),
      ]),
      createReplaceStream('supercalifragilisticexpialidocious', '*'),
    ])).to.be('foo supercalifragili sticexpialidocious bar');
  });
});
