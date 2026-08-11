/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILE_SO_TYPE } from '@kbn/files-plugin/common/constants';
import { FILE_ATTACHMENT_TYPE } from '../../../../constants/attachments';
import { FileAttachmentMetadataSchema, FileAttachmentPayloadSchema } from './v2';

const validFile = {
  name: 'screenshot',
  extension: 'png',
  mimeType: 'image/png',
  created: '2024-01-01T00:00:00.000Z',
};

const validMetadata = { files: [validFile], soType: FILE_SO_TYPE };

const validPayload = {
  type: FILE_ATTACHMENT_TYPE,
  owner: 'securitySolution',
  attachmentId: 'file-id-1',
  metadata: validMetadata,
};

describe('FileAttachmentMetadataSchema', () => {
  it('accepts a single-file metadata payload with the locked `soType`', () => {
    expect(FileAttachmentMetadataSchema.safeParse(validMetadata).success).toBe(true);
  });

  it('rejects metadata with zero files', () => {
    const result = FileAttachmentMetadataSchema.safeParse({ files: [], soType: FILE_SO_TYPE });
    expect(result.success).toBe(false);
  });

  it('rejects more than one file', () => {
    const result = FileAttachmentMetadataSchema.safeParse({
      files: [validFile, validFile],
      soType: FILE_SO_TYPE,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing `soType`', () => {
    const { soType: _soType, ...rest } = validMetadata;
    expect(FileAttachmentMetadataSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a forged `soType` (must equal FILE_SO_TYPE)', () => {
    expect(
      FileAttachmentMetadataSchema.safeParse({ ...validMetadata, soType: 'cases' }).success
    ).toBe(false);
  });

  it('rejects unknown keys (strict)', () => {
    expect(FileAttachmentMetadataSchema.safeParse({ ...validMetadata, foo: 'bar' }).success).toBe(
      false
    );
  });

  it('rejects a file missing required fields', () => {
    expect(
      FileAttachmentMetadataSchema.safeParse({
        files: [{ name: 'screenshot', extension: 'png', mimeType: 'image/png' }],
        soType: FILE_SO_TYPE,
      }).success
    ).toBe(false);
  });

  it('rejects extra keys on a file entry (entry is strict)', () => {
    expect(
      FileAttachmentMetadataSchema.safeParse({
        files: [{ ...validFile, id: 'so-id', updated: '2024-01-02T00:00:00.000Z' }],
        soType: FILE_SO_TYPE,
      }).success
    ).toBe(false);
  });
});

describe('FileAttachmentPayloadSchema', () => {
  it('accepts a valid file payload', () => {
    expect(FileAttachmentPayloadSchema.safeParse(validPayload).success).toBe(true);
  });

  it('rejects a payload carrying `data` (file is reference-shaped)', () => {
    expect(
      FileAttachmentPayloadSchema.safeParse({ ...validPayload, data: { foo: 'bar' } }).success
    ).toBe(false);
  });

  it('rejects an array attachmentId (file is single-id)', () => {
    expect(
      FileAttachmentPayloadSchema.safeParse({
        ...validPayload,
        attachmentId: ['file-id-1', 'file-id-2'],
      }).success
    ).toBe(false);
  });

  it('rejects a wrong type literal', () => {
    expect(
      FileAttachmentPayloadSchema.safeParse({ ...validPayload, type: 'comment' }).success
    ).toBe(false);
  });

  it('rejects a missing owner', () => {
    const { owner: _owner, ...rest } = validPayload;
    expect(FileAttachmentPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a missing attachmentId', () => {
    const { attachmentId: _id, ...rest } = validPayload;
    expect(FileAttachmentPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a missing metadata', () => {
    const { metadata: _metadata, ...rest } = validPayload;
    expect(FileAttachmentPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects unknown keys at the payload level (strict)', () => {
    expect(FileAttachmentPayloadSchema.safeParse({ ...validPayload, foo: 'bar' }).success).toBe(
      false
    );
  });
});
