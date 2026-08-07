/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  compressionMimeTypes,
  IMAGE_MIME_TYPES,
  pdfMimeTypes,
  textMimeTypes,
} from '../../../../common/constants/mime_types';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import { FILE_ATTACHMENT_TYPE, SECURITY_SOLUTION_OWNER } from '../../../../common/constants';
import { basicComment } from '../../../containers/mock';
import type { AttachmentUIV2 } from '../../../../common/ui/types';
import { makeFileComment } from './case_view_files.test';
import { getFileIdsFromComments, getFilesFromComments, isImage, parseMimeType } from './utils';

const imageMimeTypes = Array.from(IMAGE_MIME_TYPES);

describe('isImage', () => {
  it.each(imageMimeTypes)('should return true for image mime type: %s', (mimeType) => {
    expect(isImage({ mimeType })).toBeTruthy();
  });

  it.each(textMimeTypes)('should return false for text mime type: %s', (mimeType) => {
    expect(isImage({ mimeType })).toBeFalsy();
  });
});

describe('parseMimeType', () => {
  it('should return Unknown for empty strings', () => {
    expect(parseMimeType('')).toBe('Unknown');
  });

  it('should return Unknown for undefined', () => {
    expect(parseMimeType(undefined)).toBe('Unknown');
  });

  it('should return Unknown for strings starting with forward slash', () => {
    expect(parseMimeType('/start')).toBe('Unknown');
  });

  it('should return Unknown for strings with no forward slash', () => {
    expect(parseMimeType('no-slash')).toBe('Unknown');
  });

  it('should return capitalize first letter for valid strings', () => {
    expect(parseMimeType('foo/bar')).toBe('Foo');
  });

  it.each(imageMimeTypes)('should return "Image" for image mime type: %s', (mimeType) => {
    expect(parseMimeType(mimeType)).toBe('Image');
  });

  it.each(textMimeTypes)('should return "Text" for text mime type: %s', (mimeType) => {
    expect(parseMimeType(mimeType)).toBe('Text');
  });

  it.each(compressionMimeTypes)(
    'should return "Compressed" for image mime type: %s',
    (mimeType) => {
      expect(parseMimeType(mimeType)).toBe('Compressed');
    }
  );

  it.each(pdfMimeTypes)('should return "Pdf" for text mime type: %s', (mimeType) => {
    expect(parseMimeType(mimeType)).toBe('PDF');
  });
});

describe('getFileIdsFromComments', () => {
  const owner = SECURITY_SOLUTION_OWNER;

  it('returns an empty set when there are no file comments', () => {
    expect(getFileIdsFromComments([basicComment], owner)).toEqual(new Set());
  });

  it('extracts a single file id from a string attachmentId', () => {
    const result = getFileIdsFromComments([makeFileComment('c1', 'file-1', owner)], owner);
    expect(result).toEqual(new Set(['file-1']));
  });

  it('expands array-shaped attachmentId values into individual ids', () => {
    const result = getFileIdsFromComments(
      [makeFileComment('c1', ['file-1', 'file-2'], owner)],
      owner
    );
    expect(result).toEqual(new Set(['file-1', 'file-2']));
  });

  it('deduplicates ids across multiple file comments', () => {
    const result = getFileIdsFromComments(
      [makeFileComment('c1', 'file-1', owner), makeFileComment('c2', 'file-1', owner)],
      owner
    );
    expect(result).toEqual(new Set(['file-1']));
  });

  it('ignores non-file comments', () => {
    const result = getFileIdsFromComments(
      [basicComment, makeFileComment('c1', 'file-1', owner)],
      owner
    );
    expect(result).toEqual(new Set(['file-1']));
  });
});

describe('getFilesFromComments', () => {
  const owner = SECURITY_SOLUTION_OWNER;

  const makeUnifiedFileComment = (name: string, extension: string): AttachmentUIV2 =>
    ({
      type: FILE_ATTACHMENT_TYPE,
      id: `c-${name}`,
      attachmentId: `file-${name}`,
      metadata: {
        files: [{ name, extension, mimeType: 'image/png', created: '2024-01-01T00:00:00.000Z' }],
        soType: FILE_SO_TYPE,
      },
    } as unknown as AttachmentUIV2);

  it('returns an empty array when there are no file comments', () => {
    expect(getFilesFromComments([basicComment], owner)).toEqual([]);
  });

  it('extracts name + extension from unified file comments', () => {
    const result = getFilesFromComments([makeUnifiedFileComment('report', 'pdf')], owner);
    expect(result).toEqual([{ name: 'report', extension: 'pdf' }]);
  });

  it('ignores file comments without valid metadata', () => {
    // Legacy external-reference file comments carry `externalReferenceMetadata`,
    // not the unified `metadata.files`, so they are skipped.
    expect(getFilesFromComments([makeFileComment('c1', 'file-1', owner)], owner)).toEqual([]);
  });
});
