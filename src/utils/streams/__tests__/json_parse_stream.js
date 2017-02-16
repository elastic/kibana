import expect from 'expect.js';

import {
  createPromiseFromStreams,
  createListStream,
  createConcatStream,
  createJsonParseStream
} from '../';

describe('jsonParseStream', () => {
  describe('standard usage', () => {
    it('parses json strings', async () => {
      const str = createJsonParseStream();
      const dataPromise = new Promise((resolve, reject) => {
        str.on('data', resolve);
        str.on('error', reject);
      });
      str.write('{ "foo": "bar" }');

      expect(await dataPromise).to.eql({
        foo: 'bar'
      });
    });

    it('parses json value passed to it from a list stream', async () => {
      expect(await createPromiseFromStreams([
        createListStream([
          '"foo"',
          '1'
        ]),
        createJsonParseStream(),
        createConcatStream([])
      ]))
      .to.eql(['foo', 1]);
    });
  });

  describe('error handling', () => {
    it('emits an error when there is a parse failure', async () => {
      const str = createJsonParseStream();
      const errorPromise = new Promise(resolve => str.once('error', resolve));
      str.write('{"partial');
      const err = await errorPromise;
      expect(err).to.be.an(Error);
      expect(err).to.have.property('name', 'SyntaxError');
    });

    it('continues parsing after an error', async () => {
      const str = createJsonParseStream();

      const firstEmitPromise = new Promise(resolve => {
        str.once('error', v => resolve({ name: 'error', value: v }));
        str.once('data', v => resolve({ name: 'data', value: v }));
      });

      str.write('{"partial');
      const firstEmit = await firstEmitPromise;
      expect(firstEmit).to.have.property('name', 'error');
      expect(firstEmit.value).to.be.an(Error);

      const secondEmitPromise = new Promise(resolve => {
        str.once('error', v => resolve({ name: 'error', value: v }));
        str.once('data', v => resolve({ name: 'data', value: v }));
      });

      str.write('42');
      const secondEmit = await secondEmitPromise;
      expect(secondEmit).to.have.property('name', 'data');
      expect(secondEmit).to.have.property('value', 42);
    });
  });
});
