/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BINARY_BYTES } from '@kbn/agent-builder-common/attachments';
import { MAX_FILES_PER_MESSAGE, rejectIfTooManyFiles, rejectInvalidFile } from './file_checks';

const KB = 1024;
const MB = 1024 * KB;

const createFile = ({ name = 'invoice.pdf', type = 'application/pdf', size = 4 } = {}) =>
  new File([new Uint8Array(size)], name, { type });

describe('rejectInvalidFile', () => {
  it.each([
    ['a small PDF', createFile()],
    ['a Markdown file with an empty type', createFile({ name: 'notes.md', type: '' })],
    ['a CSV file', createFile({ name: 'data.csv', type: 'text/csv' })],
    ['a text file of exactly 256 KB', createFile({ name: 'notes.txt', type: '', size: 256 * KB })],
    [
      'a PDF of exactly the maximum size',
      createFile({ size: MAX_BINARY_BYTES['application/pdf'] }),
    ],
  ])('accepts %s', (_label, file) => {
    const addErrorToast = jest.fn();

    expect(rejectInvalidFile({ file, addErrorToast })).toBe(false);
    expect(addErrorToast).not.toHaveBeenCalled();
  });

  it.each([
    ['a Word file', 'report.docx'],
    ['a file without a known type', 'README'],
  ])('rejects %s', (_label, name) => {
    const addErrorToast = jest.fn();

    expect(rejectInvalidFile({ file: createFile({ name, type: '' }), addErrorToast })).toBe(true);
    expect(addErrorToast).toHaveBeenCalledWith({
      title: 'This file type is not supported.',
      text: name,
    });
  });

  it.each([
    ['a PDF', 'invoice.pdf', 'application/pdf', 10 * MB, '10 MB'],
    ['a Markdown file', 'notes.md', 'text/markdown', 256 * KB, '256 KB'],
    ['a text file', 'notes.txt', 'text/plain', 256 * KB, '256 KB'],
    ['a CSV file', 'data.csv', 'text/csv', 256 * KB, '256 KB'],
  ])('rejects %s that is over its own limit', (_label, name, type, limit, limitLabel) => {
    const addErrorToast = jest.fn();
    const file = createFile({ name, type, size: limit + 1 });

    expect(rejectInvalidFile({ file, addErrorToast })).toBe(true);
    expect(addErrorToast).toHaveBeenCalledWith({
      title: `The file is too large. The maximum size is ${limitLabel}.`,
      text: name,
    });
  });

  it('uses the limit of the file type, not one limit for all', () => {
    const addErrorToast = jest.fn();

    expect(
      rejectInvalidFile({
        file: createFile({ name: 'notes.txt', type: 'text/plain', size: 300 * KB }),
        addErrorToast,
      })
    ).toBe(true);
    expect(rejectInvalidFile({ file: createFile({ size: 300 * KB }), addErrorToast })).toBe(false);
  });
});

describe('rejectIfTooManyFiles', () => {
  it('allows files below the limit', () => {
    const addErrorToast = jest.fn();

    expect(
      rejectIfTooManyFiles({
        currentFileCount: MAX_FILES_PER_MESSAGE - 1,
        fileName: 'notes.md',
        addErrorToast,
      })
    ).toBe(false);
    expect(addErrorToast).not.toHaveBeenCalled();
  });

  it('blocks the file after the limit with a toast', () => {
    const addErrorToast = jest.fn();

    expect(
      rejectIfTooManyFiles({
        currentFileCount: MAX_FILES_PER_MESSAGE,
        fileName: 'notes.md',
        addErrorToast,
      })
    ).toBe(true);
    expect(addErrorToast).toHaveBeenCalledWith({
      title: 'You can attach up to 10 files per message.',
      text: 'notes.md',
    });
  });

  it('allows 10 files per message', () => {
    expect(MAX_FILES_PER_MESSAGE).toBe(10);
  });
});
