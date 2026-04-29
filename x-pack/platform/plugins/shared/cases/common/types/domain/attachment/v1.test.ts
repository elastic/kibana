/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentAttributesBasicRt,
  FileAttachmentMetadataRt,
  SingleFileAttachmentMetadataRt,
  AttachmentType,
  UserCommentAttachmentPayloadRt,
  AlertAttachmentPayloadRt,
  ActionsAttachmentPayloadRt,
  ExternalReferenceStorageType,
  ExternalReferenceAttachmentPayloadRt,
  PersistableStateAttachmentPayloadRt,
  AttachmentRt,
  UserCommentAttachmentRt,
  AlertAttachmentRt,
  ActionsAttachmentRt,
  ExternalReferenceAttachmentRt,
  PersistableStateAttachmentRt,
  AttachmentPatchAttributesRt,
} from './v1';

describe('Attachments', () => {
  describe('Files', () => {
    describe('SingleFileAttachmentMetadataRt', () => {
      const defaultRequest = {
        created: '2020-02-19T23:06:33.798Z',
        extension: 'png',
        mimeType: 'image/png',
        name: 'my-super-cool-screenshot',
      };

      it('has expected attributes in request', () => {
        const query = SingleFileAttachmentMetadataRt.decode(defaultRequest);

        expect(query).toStrictEqual({
          _tag: 'Right',
          right: defaultRequest,
        });
      });

      it('removes foo:bar attributes from request', () => {
        const query = SingleFileAttachmentMetadataRt.decode({ ...defaultRequest, foo: 'bar' });

        expect(query).toStrictEqual({
          _tag: 'Right',
          right: defaultRequest,
        });
      });
    });

    describe('FileAttachmentMetadataRt', () => {
      const defaultRequest = {
        created: '2020-02-19T23:06:33.798Z',
        extension: 'png',
        mimeType: 'image/png',
        name: 'my-super-cool-screenshot',
      };

      it('has expected attributes in request', () => {
        const query = FileAttachmentMetadataRt.decode({ files: [defaultRequest] });

        expect(query).toStrictEqual({
          _tag: 'Right',
          right: {
            files: [
              {
                ...defaultRequest,
              },
            ],
          },
        });
      });

      it('removes foo:bar attributes from request', () => {
        const query = FileAttachmentMetadataRt.decode({
          files: [{ ...defaultRequest, foo: 'bar' }],
        });

        expect(query).toStrictEqual({
          _tag: 'Right',
          right: {
            files: [
              {
                ...defaultRequest,
              },
            ],
          },
        });
      });
    });
  });

  describe('AttachmentAttributesBasicRt', () => {
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
      const query = AttachmentAttributesBasicRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = AttachmentAttributesBasicRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('UserCommentAttachmentPayloadRt', () => {
    const defaultRequest = {
      comment: 'This is a sample comment',
      type: AttachmentType.user,
      owner: 'cases',
    };

    it('has expected attributes in request', () => {
      const query = UserCommentAttachmentPayloadRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = UserCommentAttachmentPayloadRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('AlertAttachmentPayloadRt', () => {
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
      const query = AlertAttachmentPayloadRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = AlertAttachmentPayloadRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from rule', () => {
      const query = AlertAttachmentPayloadRt.decode({
        ...defaultRequest,
        rule: { id: 'rule-id-1', name: 'Awesome rule', foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('ActionsAttachmentPayloadRt', () => {
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
      const query = ActionsAttachmentPayloadRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ActionsAttachmentPayloadRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from actions', () => {
      const query = ActionsAttachmentPayloadRt.decode({
        ...defaultRequest,
        actions: {
          targets: [
            {
              hostname: 'host1',
              endpointId: '001',
            },
          ],
          type: 'isolate',
          foo: 'bar',
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from targets', () => {
      const query = ActionsAttachmentPayloadRt.decode({
        ...defaultRequest,
        actions: {
          targets: [
            {
              hostname: 'host1',
              endpointId: '001',
              foo: 'bar',
            },
          ],
          type: 'isolate',
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('ExternalReferenceAttachmentPayloadRt', () => {
    const defaultRequest = {
      type: AttachmentType.externalReference,
      externalReferenceId: 'my-id',
      externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
      externalReferenceAttachmentTypeId: '.test',
      externalReferenceMetadata: { test_foo: 'foo' },
      owner: 'cases',
    };
    it('has expected attributes in request', () => {
      const query = ExternalReferenceAttachmentPayloadRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ExternalReferenceAttachmentPayloadRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from externalReferenceStorage', () => {
      const query = ExternalReferenceAttachmentPayloadRt.decode({
        ...defaultRequest,
        externalReferenceStorage: {
          type: ExternalReferenceStorageType.elasticSearchDoc,
          foo: 'bar',
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from externalReferenceStorage with soType', () => {
      const query = ExternalReferenceAttachmentPayloadRt.decode({
        ...defaultRequest,
        externalReferenceStorage: {
          type: ExternalReferenceStorageType.savedObject,
          soType: 'awesome',
          foo: 'bar',
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          ...defaultRequest,
          externalReferenceStorage: {
            type: ExternalReferenceStorageType.savedObject,
            soType: 'awesome',
          },
        },
      });
    });
  });

  describe('PersistableStateAttachmentPayloadRt', () => {
    const defaultRequest = {
      type: AttachmentType.persistableState,
      persistableStateAttachmentState: { test_foo: 'foo' },
      persistableStateAttachmentTypeId: '.test',
      owner: 'cases',
    };
    it('has expected attributes in request', () => {
      const query = PersistableStateAttachmentPayloadRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = PersistableStateAttachmentPayloadRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from persistableStateAttachmentState', () => {
      const query = PersistableStateAttachmentPayloadRt.decode({
        ...defaultRequest,
        persistableStateAttachmentState: { test_foo: 'foo', foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          ...defaultRequest,
          persistableStateAttachmentState: { test_foo: 'foo', foo: 'bar' },
        },
      });
    });
  });

  describe('AttachmentRt', () => {
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
      const query = AttachmentRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = AttachmentRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('UserCommentAttachmentRt', () => {
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
      const query = UserCommentAttachmentRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = UserCommentAttachmentRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('AlertAttachmentRt', () => {
    const defaultRequest = {
      alertId: 'alert-id-1',
      index: 'alert-index-1',
      type: AttachmentType.alert,
      id: 'alert-comment-id',
      owner: 'cases',
      rule: {
        id: 'rule-id-1',
        name: 'Awesome rule',
      },
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
      const query = AlertAttachmentRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = AlertAttachmentRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from created_by', () => {
      const query = AlertAttachmentRt.decode({
        ...defaultRequest,
        created_by: {
          full_name: 'Leslie Knope',
          username: 'lknope',
          email: 'leslie.knope@elastic.co',
          foo: 'bar',
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('ActionsAttachmentRt', () => {
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
      const query = ActionsAttachmentRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ActionsAttachmentRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('ExternalReferenceAttachmentRt', () => {
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
      const query = ExternalReferenceAttachmentRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ExternalReferenceAttachmentRt.decode({
        ...defaultRequest,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('PersistableStateAttachmentRt', () => {
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
      const query = PersistableStateAttachmentRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = PersistableStateAttachmentRt.decode({
        ...defaultRequest,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('AttachmentPatchAttributesRt', () => {
    const defaultRequest = {
      type: AttachmentType.actions,
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
      const query = AttachmentPatchAttributesRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = AttachmentPatchAttributesRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
