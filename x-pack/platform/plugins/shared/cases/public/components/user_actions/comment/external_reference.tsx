/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalReferenceAttachment } from '../../../../common/types/domain';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import type { SnakeToCamelCase } from '../../../../common/types';
import { createRegisteredAttachmentUserActionBuilder } from './registered_attachments';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  | 'userAction'
  | 'externalReferenceAttachmentTypeRegistry'
  | 'caseData'
  | 'handleDeleteComment'
  | 'userProfiles'
> & {
  attachment: SnakeToCamelCase<ExternalReferenceAttachment>;
  isLoading: boolean;
};

export const createExternalReferenceAttachmentUserActionBuilder = ({
  userAction,
  userProfiles,
  attachment,
  externalReferenceAttachmentTypeRegistry,
  caseData,
  isLoading,
  handleDeleteComment,
}: BuilderArgs): ReturnType<UserActionBuilder> => {
  return createRegisteredAttachmentUserActionBuilder({
    userAction,
    userProfiles,
    attachment,
    registry: externalReferenceAttachmentTypeRegistry,
    caseData,
    handleDeleteComment,
    isLoading,
    getId: () => attachment.externalReferenceAttachmentTypeId,
    getAttachmentViewProps: () => ({
      externalReferenceId: attachment.externalReferenceId,
      externalReferenceMetadata: attachment.externalReferenceMetadata,
    }),
  });
};
