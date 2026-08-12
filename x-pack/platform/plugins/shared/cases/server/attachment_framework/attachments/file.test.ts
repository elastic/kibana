/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILE_SO_TYPE } from '@kbn/files-plugin/common/constants';
import { decodeFileAttachmentMetadata, fileAttachmentType } from './file';
import { FileAttachmentPayloadSchema } from '../../../common/types/domain_zod/attachment/file/v2';
import { FILE_ATTACHMENT_TYPE } from '../../../common/constants/attachments';

const validFile = {
  name: 'screenshot',
  extension: 'png',
  mimeType: 'image/png',
  created: '2024-01-01T00:00:00.000Z',
};

describe('fileAttachmentType', () => {
  it('registers with the unified registry using the v2 zod payload schema', () => {
    expect(fileAttachmentType.id).toBe(FILE_ATTACHMENT_TYPE);
    expect(fileAttachmentType.schema).toBe(FileAttachmentPayloadSchema);
  });
});

describe('decodeFileAttachmentMetadata', () => {
  const validMetadata = { files: [validFile], soType: FILE_SO_TYPE };

  it('accepts a single-file metadata payload with the locked soType', () => {
    expect(decodeFileAttachmentMetadata(validMetadata)).toEqual(validMetadata);
  });

  it('rejects more than one file in a single attachment', () => {
    expect(() =>
      decodeFileAttachmentMetadata({ ...validMetadata, files: [validFile, validFile] })
    ).toThrow();
  });

  it('rejects an empty files array', () => {
    expect(() => decodeFileAttachmentMetadata({ ...validMetadata, files: [] })).toThrow();
  });

  it('rejects a forged soType', () => {
    expect(() =>
      decodeFileAttachmentMetadata({ ...validMetadata, soType: 'something-else' })
    ).toThrow();
  });

  it('rejects a missing soType', () => {
    expect(() => decodeFileAttachmentMetadata({ files: [validFile] })).toThrow();
  });

  it('rejects unknown excess keys (strict)', () => {
    expect(() => decodeFileAttachmentMetadata({ ...validMetadata, foo: 'bar' })).toThrow();
  });

  it('rejects non-object input', () => {
    expect(() => decodeFileAttachmentMetadata('not-an-object')).toThrow();
    expect(() => decodeFileAttachmentMetadata(null)).toThrow();
  });
});
