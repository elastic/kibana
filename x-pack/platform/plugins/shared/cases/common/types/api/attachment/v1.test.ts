/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_BULK_CREATE_ATTACHMENTS,
  MAX_BULK_GET_ATTACHMENTS,
  MAX_COMMENT_LENGTH,
  MAX_DELETE_FILES,
} from '../../../constants';
import { DeepStrict } from '@kbn/zod-helpers';
import { parseErrors } from '../../../test_helpers/zod_schema_test_utils';
import { AttachmentType, ExternalReferenceStorageType } from '../../domain/attachment/v1';
import {
  AttachmentPatchRequestSchema,
  AttachmentRequestSchema,
  BulkCreateAttachmentsRequestSchema,
  BulkDeleteFileAttachmentsRequestSchema,
  BulkGetAttachmentsRequestSchema,
} from './v1';

const validUserComment = {
  type: AttachmentType.user,
  comment: 'Hello',
  owner: 'cases',
};

const validAlert = {
  type: AttachmentType.alert,
  alertId: ['alert-1'],
  index: ['.alerts-1'],
  rule: { id: 'rule-1', name: 'Rule One' },
  owner: 'cases',
};

const validEvent = {
  type: AttachmentType.event,
  eventId: ['evt-1'],
  index: ['.events-1'],
  owner: 'cases',
};

const validActions = {
  type: AttachmentType.actions,
  comment: 'Isolating host',
  actions: {
    targets: [{ hostname: 'host-1', endpointId: 'ep-1' }],
    type: 'isolate',
  },
  owner: 'cases',
};

const validExternalRefNoSO = {
  type: AttachmentType.externalReference,
  externalReferenceId: 'ext-1',
  externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
  externalReferenceAttachmentTypeId: 'foo',
  externalReferenceMetadata: null,
  owner: 'cases',
};

const validExternalRefSO = {
  type: AttachmentType.externalReference,
  externalReferenceId: 'ext-2',
  externalReferenceStorage: {
    type: ExternalReferenceStorageType.savedObject,
    soType: 'my-so-type',
  },
  externalReferenceAttachmentTypeId: 'foo',
  externalReferenceMetadata: { foo: 'bar' },
  owner: 'cases',
};

const validPersistableState = {
  type: AttachmentType.persistableState,
  persistableStateAttachmentTypeId: 'persistable-1',
  persistableStateAttachmentState: { key: 'value' },
  owner: 'cases',
};

describe('AttachmentRequestSchema', () => {
  describe('user comment variant', () => {
    it('accepts a valid user comment', () => {
      expect(AttachmentRequestSchema.safeParse(validUserComment).success).toBe(true);
    });

    it('rejects an empty comment string', () => {
      expect(parseErrors(AttachmentRequestSchema, { ...validUserComment, comment: '' })).toContain(
        'The comment field cannot be an empty string.'
      );
    });

    it('rejects whitespace-only comment (limitedStringSchema parity)', () => {
      expect(
        parseErrors(AttachmentRequestSchema, { ...validUserComment, comment: '   ' })
      ).toContain('The comment field cannot be an empty string.');
    });

    it(`rejects a comment longer than MAX_COMMENT_LENGTH (${MAX_COMMENT_LENGTH})`, () => {
      const comment = 'a'.repeat(MAX_COMMENT_LENGTH + 1);
      expect(parseErrors(AttachmentRequestSchema, { ...validUserComment, comment })).toContain(
        `The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
      );
    });

    it('rejects a missing owner', () => {
      const { owner, ...rest } = validUserComment;
      expect(AttachmentRequestSchema.safeParse(rest).success).toBe(false);
    });
  });

  describe('alert variant', () => {
    it('accepts a valid alert payload (array form)', () => {
      expect(AttachmentRequestSchema.safeParse(validAlert).success).toBe(true);
    });

    it('accepts a valid alert payload (string form for alertId / index)', () => {
      const result = AttachmentRequestSchema.safeParse({
        ...validAlert,
        alertId: 'alert-1',
        index: '.alerts-1',
      });
      expect(result.success).toBe(true);
    });

    it('accepts null rule id and name (legacy alerts)', () => {
      const result = AttachmentRequestSchema.safeParse({
        ...validAlert,
        rule: { id: null, name: null },
      });
      expect(result.success).toBe(true);
    });

    it('rejects a missing rule', () => {
      const { rule, ...rest } = validAlert;
      expect(AttachmentRequestSchema.safeParse(rest).success).toBe(false);
    });
  });

  describe('event variant', () => {
    it('accepts a valid event payload', () => {
      expect(AttachmentRequestSchema.safeParse(validEvent).success).toBe(true);
    });

    it('rejects a missing eventId', () => {
      const { eventId, ...rest } = validEvent;
      expect(AttachmentRequestSchema.safeParse(rest).success).toBe(false);
    });
  });

  describe('actions variant', () => {
    it('accepts a valid actions payload', () => {
      expect(AttachmentRequestSchema.safeParse(validActions).success).toBe(true);
    });

    it('rejects an empty actions comment', () => {
      expect(parseErrors(AttachmentRequestSchema, { ...validActions, comment: '' })).toContain(
        'The comment field cannot be an empty string.'
      );
    });

    it('rejects malformed actions.targets', () => {
      const result = AttachmentRequestSchema.safeParse({
        ...validActions,
        actions: { ...validActions.actions, targets: [{ hostname: 'h' }] },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('externalReference variant', () => {
    it('accepts the elasticSearchDoc-storage form', () => {
      expect(AttachmentRequestSchema.safeParse(validExternalRefNoSO).success).toBe(true);
    });

    it('accepts the savedObject-storage form', () => {
      expect(AttachmentRequestSchema.safeParse(validExternalRefSO).success).toBe(true);
    });

    it('rejects an unknown storage type', () => {
      const result = AttachmentRequestSchema.safeParse({
        ...validExternalRefNoSO,
        externalReferenceStorage: { type: 'mongo' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('persistableState variant', () => {
    it('accepts a valid persistableState payload', () => {
      expect(AttachmentRequestSchema.safeParse(validPersistableState).success).toBe(true);
    });

    it('rejects a missing persistableStateAttachmentState', () => {
      const { persistableStateAttachmentState, ...rest } = validPersistableState;
      expect(AttachmentRequestSchema.safeParse(rest).success).toBe(false);
    });
  });

  describe('union dispatch', () => {
    it('rejects an unknown type literal', () => {
      const result = AttachmentRequestSchema.safeParse({
        type: 'banana',
        owner: 'cases',
        comment: 'x',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('AttachmentPatchRequestSchema', () => {
  it('requires id and version on top of a full type body', () => {
    const result = AttachmentPatchRequestSchema.safeParse({
      ...validUserComment,
      id: 'a',
      version: 'b',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a body missing id', () => {
    const result = AttachmentPatchRequestSchema.safeParse({
      ...validUserComment,
      version: 'b',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a body missing version', () => {
    const result = AttachmentPatchRequestSchema.safeParse({
      ...validUserComment,
      id: 'a',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a body missing the type / payload (partial updates not allowed)', () => {
    const result = AttachmentPatchRequestSchema.safeParse({
      id: 'a',
      version: 'b',
      comment: 'just an update',
      owner: 'cases',
    });
    expect(result.success).toBe(false);
  });

  it('honors the type-specific validation on top of id/version', () => {
    const result = AttachmentPatchRequestSchema.safeParse({
      ...validUserComment,
      comment: '',
      id: 'a',
      version: 'b',
    });
    expect(result.success).toBe(false);
  });

  it('DeepStrict-wrapped schema rejects unknown top-level fields on patch (route-layer parity)', () => {
    const result = DeepStrict(AttachmentPatchRequestSchema).safeParse({
      ...validUserComment,
      id: 'a',
      version: 'b',
      rogue: 'field',
    });
    expect(result.success).toBe(false);
  });
});

describe('BulkCreateAttachmentsRequestSchema', () => {
  it('accepts an empty array', () => {
    expect(BulkCreateAttachmentsRequestSchema.safeParse([]).success).toBe(true);
  });

  it('accepts a mix of valid attachment variants', () => {
    expect(
      BulkCreateAttachmentsRequestSchema.safeParse([validUserComment, validAlert, validActions])
        .success
    ).toBe(true);
  });

  it(`rejects more than MAX_BULK_CREATE_ATTACHMENTS (${MAX_BULK_CREATE_ATTACHMENTS}) items`, () => {
    const items = Array(MAX_BULK_CREATE_ATTACHMENTS + 1).fill(validUserComment);
    expect(parseErrors(BulkCreateAttachmentsRequestSchema, items)).toContain(
      `The length of the field attachments is too long. Array must be of length <= ${MAX_BULK_CREATE_ATTACHMENTS}.`
    );
  });
});

describe('BulkDeleteFileAttachmentsRequestSchema', () => {
  it('accepts a single non-empty id', () => {
    expect(BulkDeleteFileAttachmentsRequestSchema.safeParse({ ids: ['file-1'] }).success).toBe(
      true
    );
  });

  it('rejects an empty ids array', () => {
    expect(parseErrors(BulkDeleteFileAttachmentsRequestSchema, { ids: [] })).toContain(
      'The length of the field ids is too short. Array must be of length >= 1.'
    );
  });

  it(`rejects more than MAX_DELETE_FILES (${MAX_DELETE_FILES}) ids`, () => {
    const ids = Array(MAX_DELETE_FILES + 1).fill('id');
    expect(parseErrors(BulkDeleteFileAttachmentsRequestSchema, { ids })).toContain(
      `The length of the field ids is too long. Array must be of length <= ${MAX_DELETE_FILES}.`
    );
  });

  it('rejects an empty-string id (NonEmptyString parity)', () => {
    expect(parseErrors(BulkDeleteFileAttachmentsRequestSchema, { ids: [''] })).toContain(
      'string must have length >= 1'
    );
  });

  it('rejects a whitespace-only id (NonEmptyString parity)', () => {
    expect(parseErrors(BulkDeleteFileAttachmentsRequestSchema, { ids: ['   '] })).toContain(
      'string must have length >= 1'
    );
  });
});

describe('BulkGetAttachmentsRequestSchema', () => {
  it('accepts a single id', () => {
    expect(BulkGetAttachmentsRequestSchema.safeParse({ ids: ['a'] }).success).toBe(true);
  });

  it('rejects an empty ids array', () => {
    expect(parseErrors(BulkGetAttachmentsRequestSchema, { ids: [] })).toContain(
      'The length of the field ids is too short. Array must be of length >= 1.'
    );
  });

  it(`rejects more than MAX_BULK_GET_ATTACHMENTS (${MAX_BULK_GET_ATTACHMENTS}) ids`, () => {
    const ids = Array(MAX_BULK_GET_ATTACHMENTS + 1).fill('id');
    expect(parseErrors(BulkGetAttachmentsRequestSchema, { ids })).toContain(
      `The length of the field ids is too long. Array must be of length <= ${MAX_BULK_GET_ATTACHMENTS}.`
    );
  });
});
