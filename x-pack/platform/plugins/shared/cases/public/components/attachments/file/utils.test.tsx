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
import { isImage, parseMimeType } from './utils';

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
