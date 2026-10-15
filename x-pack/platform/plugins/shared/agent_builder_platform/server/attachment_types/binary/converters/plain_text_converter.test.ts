/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlainTextConverter } from './plain_text_converter';

describe('plain text converter', () => {
  const converter = createPlainTextConverter();
  const toText = (bytes: Buffer) =>
    converter.toText({
      bytes,
      fileId: 'file-abc',
      fileName: 'notes.txt',
      signal: new AbortController().signal,
    });

  it('is always available', () => {
    expect(converter.isAvailable()).toBe(true);
  });

  it('keeps UTF-8 text as it is', async () => {
    const text = 'Příliš žluťoučký kůň\n# Title';
    await expect(toText(Buffer.from(text, 'utf8'))).resolves.toBe(text);
  });

  it('removes the UTF-8 BOM', async () => {
    const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('hello')]);
    await expect(toText(bytes)).resolves.toBe('hello');
  });

  it('rejects bytes that are not valid UTF-8', async () => {
    await expect(toText(Buffer.from([0xc3, 0x28]))).rejects.toThrow('The file must be UTF-8 text.');
  });

  it('rejects UTF-16 text', async () => {
    await expect(toText(Buffer.from('hi', 'utf16le'))).rejects.toThrow(
      'The file must be UTF-8 text.'
    );
  });

  it('returns an empty string for an empty file', async () => {
    await expect(toText(Buffer.alloc(0))).resolves.toBe('');
  });
});
