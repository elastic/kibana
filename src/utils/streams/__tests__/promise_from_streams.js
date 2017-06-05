import { Writable, Duplex } from 'stream';

import expect from 'expect.js';

import {
  createListStream,
  createPromiseFromStreams,
  createReduceStream
} from '../';

describe('promiseFromStreams', () => {
  it('pipes together an array of streams', async () => {
    const str1 = createListStream([1,2,3]);
    const str2 = createReduceStream((acc, n) => acc + n, 0);
    const sumPromise = new Promise(resolve => str2.once('data', resolve));
    createPromiseFromStreams([str1, str2]);
    await new Promise(resolve => str2.once('end', resolve));
    expect(await sumPromise).to.be(6);
  });

  describe('last stream is writable', () => {
    it('waits for the last stream to finish writing', async () => {
      let written = '';

      await createPromiseFromStreams([
        createListStream(['a']),
        new Writable({
          write(chunk, enc, cb) {
            setTimeout(() => {
              written += chunk;
              cb();
            }, 100);
          }
        })
      ]);

      expect(written).to.be('a');
    });

    it('resolves to undefined', async () => {
      const result = await createPromiseFromStreams([
        createListStream(['a']),
        new Writable({
          write(chunk, enc, cb) {
            cb();
          }
        })
      ]);

      expect(result).to.be(undefined);
    });
  });

  describe('last stream is readable', () => {
    it(`resolves to it's final value`, async () => {
      const result = await createPromiseFromStreams([
        createListStream(['a', 'b', 'c'])
      ]);

      expect(result).to.be('c');
    });
  });

  describe('last stream is duplex', () => {
    it('waits for writing and resolves to final value', async () => {
      let written = '';
      const result = await createPromiseFromStreams([
        createListStream(['a', 'b', 'c']),
        new Duplex({
          read() {
            this.push('foo');
            this.push('bar');
            this.push(null);
          },

          write(chunk, enc, cb) {
            setTimeout(() => {
              written += chunk;
              cb();
            }, 50);
          }
        }).setEncoding('utf8')
      ]);

      expect(written).to.eql('abc');
      expect(result).to.be('bar');
    });
  });
});
