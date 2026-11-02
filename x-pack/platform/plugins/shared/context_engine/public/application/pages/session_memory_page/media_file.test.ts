/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SESSION_MEMORY_MEDIA_BYTES } from '../../../../common/constants';
import { getImagePreviewSrc, readMediaFile } from './media_file';

describe('readMediaFile', () => {
  it('reads a PNG into a base64 image media item', async () => {
    const file = new File([Uint8Array.from([137, 80, 78, 71])], 'pic.png', { type: 'image/png' });

    await expect(readMediaFile(file)).resolves.toEqual({
      type: 'image',
      value: 'data:image/png;base64,iVBORw==',
      format: 'base64',
    });
  });

  it('reads a PDF into a pdf media item', async () => {
    const file = new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' });

    await expect(readMediaFile(file)).resolves.toEqual({
      type: 'pdf',
      value: 'data:application/pdf;base64,JVBERg==',
      format: 'base64',
    });
  });

  it('rejects an unsupported type such as SVG', async () => {
    const file = new File(['<svg/>'], 'pic.svg', { type: 'image/svg+xml' });

    await expect(readMediaFile(file)).rejects.toThrow('Only PNG, JPEG, WebP, GIF, and PDF');
  });

  it('rejects a file over the decoded size cap', async () => {
    const file = new File([new Uint8Array(MAX_SESSION_MEMORY_MEDIA_BYTES + 1)], 'big.png', {
      type: 'image/png',
    });

    await expect(readMediaFile(file)).rejects.toThrow('under 1 MB');
  });
});

describe('getImagePreviewSrc', () => {
  it('returns the first image with a data or https value', () => {
    expect(
      getImagePreviewSrc([
        { type: 'pdf', value: 'data:application/pdf;base64,AA' },
        { type: 'image', value: 'http://insecure/pic.png', format: 'url' },
        { type: 'image', value: 'https://example.com/pic.png', format: 'url' },
      ])
    ).toBe('https://example.com/pic.png');
    expect(getImagePreviewSrc([{ type: 'image', value: 'data:image/png;base64,AA' }])).toBe(
      'data:image/png;base64,AA'
    );
  });

  it('returns undefined without a previewable image', () => {
    expect(getImagePreviewSrc(undefined)).toBeUndefined();
    expect(
      getImagePreviewSrc([{ type: 'pdf', value: 'data:application/pdf;base64,AA' }])
    ).toBeUndefined();
  });
});
