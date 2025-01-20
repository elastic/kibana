/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import { AttachmentType, ExternalReferenceStorageType } from '../../../common/types/domain';
import type {
  UserCommentAttachmentAttributes,
  AlertAttachmentAttributes,
  AttachmentAttributesWithoutRefs,
  ExternalReferenceWithoutRefsAttachmentPayload,
} from '../../../common/types/domain';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  FILE_ATTACHMENT_TYPE,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import { CASE_REF_NAME, EXTERNAL_REFERENCE_REF_NAME } from '../../common/constants';

export const createUserAttachment = (
  attributes?: object
): SavedObject<UserCommentAttachmentAttributes> => {
  return {
    id: '1',
    type: CASE_COMMENT_SAVED_OBJECT,
    attributes: {
      comment: 'Wow, good luck catching that bad meanie!',
      type: AttachmentType.user as const,
      created_at: '2019-11-25T21:55:00.177Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      owner: SECURITY_SOLUTION_OWNER,
      pushed_at: null,
      pushed_by: null,
      updated_at: '2019-11-25T21:55:00.177Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      ...attributes,
    },
    references: [],
  };
};

export const createAlertAttachment = (
  attributes?: object
): SavedObject<AlertAttachmentAttributes> => {
  return {
    id: '1',
    type: CASE_COMMENT_SAVED_OBJECT,
    attributes: {
      alertId: 'alert1',
      index: 'index',
      rule: {
        id: 'ruleid',
        name: 'name',
      },
      type: AttachmentType.alert as const,
      created_at: '2019-11-25T21:55:00.177Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      owner: SECURITY_SOLUTION_OWNER,
      pushed_at: null,
      pushed_by: null,
      updated_at: '2019-11-25T21:55:00.177Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      ...attributes,
    },
    references: [],
  };
};

const fileMetadata = () => ({
  name: 'test_file',
  extension: 'png',
  mimeType: 'image/png',
  created: '2023-02-27T20:26:54.345Z',
});

const fileAttachmentMetadata = () => ({
  files: [fileMetadata()],
});

const getFilesAttachmentReq = (): ExternalReferenceWithoutRefsAttachmentPayload => {
  return {
    type: AttachmentType.externalReference,
    owner: 'securitySolutionFixture',
    externalReferenceStorage: {
      type: ExternalReferenceStorageType.savedObject as const,
      soType: FILE_SO_TYPE,
    },
    externalReferenceAttachmentTypeId: FILE_ATTACHMENT_TYPE,
    externalReferenceMetadata: { ...fileAttachmentMetadata },
  };
};

export const createFileAttachment = (
  attributes?: object
): SavedObject<AttachmentAttributesWithoutRefs> => {
  return {
    id: '1',
    type: CASE_COMMENT_SAVED_OBJECT,
    attributes: {
      ...getFilesAttachmentReq(),
      created_at: '2019-11-25T21:55:00.177Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      owner: SECURITY_SOLUTION_OWNER,
      pushed_at: null,
      pushed_by: null,
      updated_at: '2019-11-25T21:55:00.177Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      ...attributes,
    },
    references: [
      { id: 'my-id', name: EXTERNAL_REFERENCE_REF_NAME, type: FILE_SO_TYPE },
      { id: 'caseId', name: CASE_REF_NAME, type: CASE_SAVED_OBJECT },
    ],
  };
};
