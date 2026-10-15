/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getFileMimeType,
  getFileName,
  getFileTypeLabel,
  resolveFileMimeType,
} from './file_type';

describe('getFileMimeType', () => {
  it.each([
    ['a.md', '', 'text/markdown'],
    ['a.markdown', 'text/x-markdown', 'text/markdown'],
    ['a.txt', '', 'text/plain'],
    ['a.txt', 'application/octet-stream', 'text/plain'],
    ['A.PDF', '', 'application/pdf'],
    ['a.pdf', 'text/plain', 'application/pdf'],
    ['my.notes.md', '', 'text/markdown'],
    ['', 'application/pdf', 'application/pdf'],
    ['README', 'text/markdown', 'text/markdown'],
    ['a.csv', 'text/plain', undefined],
    [
      'a.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      undefined,
    ],
    ['a.docx', '', undefined],
    ['a.constructor', '', undefined],
    ['a.', 'text/plain', undefined],
    ['', '', undefined],
    ['README', 'image/png', undefined],
  ])('maps name "%s" and type "%s" to %s', (name, type, expected) => {
    expect(getFileMimeType({ name, type })).toBe(expected);
  });
});

describe('getFileName', () => {
  it('keeps the name of the file', () => {
    const file = new File(['x'], 'notes.md', { type: 'text/markdown' });

    expect(getFileName(file, 'text/markdown')).toBe('notes.md');
  });

  it.each([
    ['application/pdf', 'document.pdf'],
    ['text/markdown', 'document.md'],
    ['text/plain', 'document.txt'],
  ] as const)('uses a default name for %s when the file has no name', (mimeType, expected) => {
    const file = new File(['x'], '', { type: mimeType });

    expect(getFileName(file, mimeType)).toBe(expected);
  });
});

describe('resolveFileMimeType', () => {
  it('uses the stored mime type when it is supported', () => {
    expect(resolveFileMimeType({ name: 'a.txt', mimeType: 'text/markdown' })).toBe(
      'text/markdown'
    );
  });

  it.each([[undefined], [''], ['application/msword']])(
    'takes the mime type from the name when the stored one is %s',
    (mimeType) => {
      expect(resolveFileMimeType({ name: 'a.pdf', mimeType })).toBe('application/pdf');
    }
  );

  it('is undefined when nothing tells the type', () => {
    expect(resolveFileMimeType({ name: 'README' })).toBeUndefined();
  });
});

describe('getFileTypeLabel', () => {
  it.each([
    ['application/pdf', 'PDF'],
    ['text/markdown', 'MD'],
    ['text/plain', 'TXT'],
  ] as const)('labels %s as %s', (mimeType, label) => {
    expect(getFileTypeLabel(mimeType)).toBe(label);
  });
});
