/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentType,
  ExternalReferenceStorageType,
  SingleFileAttachmentMetadataSchema,
  FileAttachmentMetadataSchema,
  AttachmentAttributesBasicSchema,
  UserCommentAttachmentPayloadSchema,
  UserCommentAttachmentSchema,
  AlertAttachmentPayloadSchema,
  AlertAttachmentSchema,
  ActionsAttachmentPayloadSchema,
  ActionsAttachmentSchema,
  ExternalReferenceAttachmentPayloadSchema,
  ExternalReferenceAttachmentSchema,
  PersistableStateAttachmentPayloadSchema,
  PersistableStateAttachmentSchema,
  AttachmentSchema,
  AttachmentPatchAttributesSchema,
} from './v1';

describe('Attachments', () => {
  describe('Files', () => {
    describe('SingleFileAttachmentMetadataSchema', () => {
      const defaultRequest = {
        created: '2020-02-19T23:06:33.798Z',
        extension: 'png',
        mimeType: 'image/png',
        name: 'my-super-cool-screenshot',
      };

      it('has expected attributes in request', () => {
        const result = SingleFileAttachmentMetadataSchema.safeParse(defaultRequest);
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(defaultRequest);
      });

      it('strips unknown fields', () => {
        const result = SingleFileAttachmentMetadataSchema.safeParse({
          ...defaultRequest,
          foo: 'bar',
        });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(defaultRequest);
      });
    });

    describe('FileAttachmentMetadataSchema', () => {
      const defaultRequest = {
        created: '2020-02-19T23:06:33.798Z',
        extension: 'png',
        mimeType: 'image/png',
        name: 'my-super-cool-screenshot',
      };

      it('has expected attributes in request', () => {
        const result = FileAttachmentMetadataSchema.safeParse({ files: [defaultRequest] });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual({ files: [defaultRequest] });
      });

      it('strips unknown fields from files', () => {
        const result = FileAttachmentMetadataSchema.safeParse({
          files: [{ ...defaultRequest, foo: 'bar' }],
        });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual({ files: [defaultRequest] });
      });
    });
  });

  describe('AttachmentAttributesBasicSchema', () => {
    const defaultRequest = {
      created_at: '2019-11-25T22:32:30.608Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      owner: 'cases',
      updated_at: null,
      updated_by: null,
      pushed_at: null,
      pushed_by: null,
    };

    it('has expected attributes in request', () => {
      const result = AttachmentAttributesBasicSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = AttachmentAttributesBasicSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('UserCommentAttachmentPayloadSchema', () => {
    const defaultRequest = {
      comment: 'This is a sample comment',
      type: AttachmentType.user,
      owner: 'cases',
    };

    it('has expected attributes in request', () => {
      const result = UserCommentAttachmentPayloadSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = UserCommentAttachmentPayloadSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('AlertAttachmentPayloadSchema', () => {
    const defaultRequest = {
      alertId: 'alert-id-1',
      index: 'alert-index-1',
      type: AttachmentType.alert,
      owner: 'cases',
      rule: {
        id: 'rule-id-1',
        name: 'Awesome rule',
      },
    };

    it('has expected attributes in request', () => {
      const result = AlertAttachmentPayloadSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = AlertAttachmentPayloadSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from rule', () => {
      const result = AlertAttachmentPayloadSchema.safeParse({
        ...defaultRequest,
        rule: { id: 'rule-id-1', name: 'Awesome rule', foo: 'bar' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('ActionsAttachmentPayloadSchema', () => {
    const defaultRequest = {
      type: AttachmentType.actions,
      comment: 'I just isolated the host!',
      actions: {
        targets: [
          {
            hostname: 'host1',
            endpointId: '001',
          },
        ],
        type: 'isolate',
      },
      owner: 'cases',
    };

    it('has expected attributes in request', () => {
      const result = ActionsAttachmentPayloadSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = ActionsAttachmentPayloadSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('ExternalReferenceAttachmentPayloadSchema', () => {
    const defaultRequest = {
      type: AttachmentType.externalReference,
      externalReferenceId: 'my-id',
      externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
      externalReferenceAttachmentTypeId: '.test',
      externalReferenceMetadata: { test_foo: 'foo' },
      owner: 'cases',
    };

    it('has expected attributes in request', () => {
      const result = ExternalReferenceAttachmentPayloadSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = ExternalReferenceAttachmentPayloadSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('PersistableStateAttachmentPayloadSchema', () => {
    const defaultRequest = {
      type: AttachmentType.persistableState,
      persistableStateAttachmentState: { test_foo: 'foo' },
      persistableStateAttachmentTypeId: '.test',
      owner: 'cases',
    };

    it('has expected attributes in request', () => {
      const result = PersistableStateAttachmentPayloadSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = PersistableStateAttachmentPayloadSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('AttachmentSchema', () => {
    const defaultRequest = {
      comment: 'Solve this fast!',
      type: AttachmentType.user,
      owner: 'cases',
      id: 'basic-comment-id',
      version: 'WzQ3LDFc',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };

    it('has expected attributes in request', () => {
      const result = AttachmentSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = AttachmentSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('UserCommentAttachmentSchema', () => {
    const defaultRequest = {
      comment: 'Solve this fast!',
      type: AttachmentType.user,
      owner: 'cases',
      id: 'basic-comment-id',
      version: 'WzQ3LDFc',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };

    it('has expected attributes in request', () => {
      const result = UserCommentAttachmentSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = UserCommentAttachmentSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('AlertAttachmentSchema', () => {
    const defaultRequest = {
      alertId: 'alert-id-1',
      index: 'alert-index-1',
      type: AttachmentType.alert,
      id: 'alert-comment-id',
      owner: 'cases',
      rule: { id: 'rule-id-1', name: 'Awesome rule' },
      version: 'WzQ3LDFc',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };

    it('has expected attributes in request', () => {
      const result = AlertAttachmentSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = AlertAttachmentSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from created_by', () => {
      const result = AlertAttachmentSchema.safeParse({
        ...defaultRequest,
        created_by: { ...defaultRequest.created_by, foo: 'bar' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('ActionsAttachmentSchema', () => {
    const defaultRequest = {
      type: AttachmentType.actions,
      comment: 'I just isolated the host!',
      actions: {
        targets: [{ hostname: 'host1', endpointId: '001' }],
        type: 'isolate',
      },
      owner: 'cases',
      id: 'basic-comment-id',
      version: 'WzQ3LDFc',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };

    it('has expected attributes in request', () => {
      const result = ActionsAttachmentSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = ActionsAttachmentSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('ExternalReferenceAttachmentSchema', () => {
    const defaultRequest = {
      type: AttachmentType.externalReference,
      externalReferenceId: 'my-id',
      externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
      externalReferenceAttachmentTypeId: '.test',
      externalReferenceMetadata: { test_foo: 'foo' },
      owner: 'cases',
      id: 'basic-comment-id',
      version: 'WzQ3LDFc',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };

    it('has expected attributes in request', () => {
      const result = ExternalReferenceAttachmentSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = ExternalReferenceAttachmentSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('PersistableStateAttachmentSchema', () => {
    const defaultRequest = {
      type: AttachmentType.persistableState,
      persistableStateAttachmentState: { test_foo: 'foo' },
      persistableStateAttachmentTypeId: '.test',
      owner: 'cases',
      id: 'basic-comment-id',
      version: 'WzQ3LDFc',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };

    it('has expected attributes in request', () => {
      const result = PersistableStateAttachmentSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = PersistableStateAttachmentSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('AttachmentPatchAttributesSchema', () => {
    const defaultRequest = {
      type: AttachmentType.actions,
      actions: {
        targets: [{ hostname: 'host1', endpointId: '001' }],
        type: 'isolate',
      },
      owner: 'cases',
    };

    it('has expected attributes in request', () => {
      const result = AttachmentPatchAttributesSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = AttachmentPatchAttributesSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});
