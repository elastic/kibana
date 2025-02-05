/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { JsonValue } from '@kbn/utility-types';

import {
  compressionMimeTypes,
  IMAGE_MIME_TYPES,
  pdfMimeTypes,
  textMimeTypes,
} from '../../../common/constants/mime_types';
import { basicFileMock } from '../../containers/mock';
import { isImage, isValidFileExternalReferenceMetadata, parseMimeType } from './utils';

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

describe('isValidFileExternalReferenceMetadata', () => {
  it('should return false for empty objects', () => {
    expect(isValidFileExternalReferenceMetadata({})).toBeFalsy();
  });

  it('should return false if the files property is missing', () => {
    expect(isValidFileExternalReferenceMetadata({ foo: 'bar' })).toBeFalsy();
  });

  it('should return false if the files property is not an array', () => {
    expect(isValidFileExternalReferenceMetadata({ files: 'bar' })).toBeFalsy();
  });

  it('should return false if files is not an array of file metadata', () => {
    expect(isValidFileExternalReferenceMetadata({ files: [3] })).toBeFalsy();
  });

  it('should return false if files is not an array of file metadata 2', () => {
    expect(
      isValidFileExternalReferenceMetadata({ files: [{ name: 'foo', mimeType: 'bar' }] })
    ).toBeFalsy();
  });

  it('should return true if the metadata is as expected', () => {
    expect(
      isValidFileExternalReferenceMetadata({ files: [basicFileMock as unknown as JsonValue] })
    ).toBeTruthy();
  });
});
