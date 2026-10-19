/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_TEXT_FILE_LENGTH } from './file_type';
import { readTextFile } from './read_text_file';

const createFile = (bytes: Uint8Array): File => {
  const file = new File([new Uint8Array(bytes)], 'notes.txt', { type: 'text/plain' });
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  Object.defineProperty(file, 'arrayBuffer', { value: () => Promise.resolve(buffer) });
  return file;
};

const textFile = (text: string) => createFile(new Uint8Array(Buffer.from(text, 'utf-8')));

describe('readTextFile', () => {
  it('reads the text of the file', async () => {
    await expect(readTextFile(textFile('# Hello'))).resolves.toEqual({
      status: 'done',
      content: '# Hello',
    });
  });

  it('keeps Czech letters', async () => {
    await expect(readTextFile(textFile('Řepa žlutá'))).resolves.toEqual({
      status: 'done',
      content: 'Řepa žlutá',
    });
  });

  it('removes the UTF-8 BOM', async () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...Buffer.from('hi', 'utf-8')]);

    await expect(readTextFile(createFile(bytes))).resolves.toEqual({
      status: 'done',
      content: 'hi',
    });
  });

  it('accepts an empty file', async () => {
    await expect(readTextFile(createFile(new Uint8Array()))).resolves.toEqual({
      status: 'done',
      content: '',
    });
  });

  it('accepts text of exactly the maximum length', async () => {
    const result = await readTextFile(textFile('a'.repeat(MAX_TEXT_FILE_LENGTH)));

    expect(result.status).toBe('done');
  });

  it.each([
    ['bytes that are not UTF-8', new Uint8Array([0xc3, 0x28])],
    ['UTF-16 text', new Uint8Array(Buffer.from('hi', 'utf16le'))],
    ['text with a NUL character', new Uint8Array(Buffer.from('a\u0000b', 'utf-8'))],
  ])('fails for %s', async (_label, bytes) => {
    await expect(readTextFile(createFile(bytes))).resolves.toEqual({
      status: 'failed',
      message: 'The file must be UTF-8 text.',
    });
  });

  it('fails when the text is too long', async () => {
    await expect(readTextFile(textFile('a'.repeat(MAX_TEXT_FILE_LENGTH + 1)))).resolves.toEqual({
      status: 'failed',
      message: 'The text of the file is too long. Try a smaller file.',
    });
  });
});
