/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionActions } from '../../../../common/types/domain';
import type { UserActionParameters } from '../types';
import { CommentUserActionBuilder } from './comment';

describe('CommentUserActionBuilder', () => {
  const baseArgs = {
    action: UserActionActions.create,
    caseId: 'test-id',
    user: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic User',
      username: 'elastic',
    },
    owner: 'securitySolutionFixture',
    savedObjectId: 'comment-id',
  };

  let builder: CommentUserActionBuilder;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-01-09T22:00:00.000Z'));
  });

  beforeEach(() => {
    builder = new CommentUserActionBuilder();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('persists a plain user comment unchanged', () => {
    const args: UserActionParameters<'comment'> = {
      ...baseArgs,
      payload: {
        attachment: {
          type: 'user' as never,
          comment: 'this is a comment',
          owner: baseArgs.owner,
        },
      },
    };

    const res = builder.build(args);

    expect(res.parameters.attributes.payload.comment).toEqual({
      type: 'user',
      comment: 'this is a comment',
      owner: baseArgs.owner,
    });
  });

  // Regression: a hybrid SO-backed type (unified internally, legacy on the wire)
  // must record its dependency under the legacy `externalReferenceId` reference
  // name, not the unified `attachmentId` one — otherwise `transform.ts`'s
  // read-side inject can't find it and callers see an empty `externalReferenceId`.
  it('projects a unified external-reference attachment to legacy and extracts the legacy reference name', () => {
    const args: UserActionParameters<'comment'> = {
      ...baseArgs,
      payload: {
        attachment: {
          type: 'file' as never,
          attachmentId: 'my-id',
          metadata: { soType: 'file', files: [{ created: '2023-02-27T20:26:54.345Z' }] },
          owner: baseArgs.owner,
        } as never,
      },
    };

    const res = builder.build(args);

    expect(res.parameters.attributes.payload.comment).toEqual({
      type: 'externalReference',
      externalReferenceStorage: { type: 'savedObject', soType: 'file' },
      externalReferenceAttachmentTypeId: '.files',
      externalReferenceMetadata: { files: [{ created: '2023-02-27T20:26:54.345Z' }] },
      owner: baseArgs.owner,
    });
    expect(res.parameters.references).toEqual(
      expect.arrayContaining([{ id: 'my-id', name: 'externalReferenceId', type: 'file' }])
    );
    expect(res.parameters.references).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'attachmentId' })])
    );
  });

  // Unified-only types (no legacy form) have nothing to project to, so they keep
  // the unified `attachmentId` reference name.
  it('keeps the unified `attachmentId` reference for a unified-only attachment', () => {
    const args: UserActionParameters<'comment'> = {
      ...baseArgs,
      payload: {
        attachment: {
          type: 'security.entity' as never,
          attachmentId: 'entity-1',
          metadata: { soType: 'entity', title: 'My entity' },
          owner: baseArgs.owner,
        } as never,
      },
    };

    const res = builder.build(args);

    expect(res.parameters.attributes.payload.comment).toMatchObject({
      type: 'security.entity',
      attachmentId: 'entity-1',
    });
    expect(res.parameters.references).toEqual(
      expect.arrayContaining([{ id: 'entity-1', name: 'attachmentId', type: 'entity' }])
    );
  });
});
