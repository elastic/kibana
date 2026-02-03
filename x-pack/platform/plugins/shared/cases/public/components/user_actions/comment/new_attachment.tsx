/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredAttachment } from '../../../../common/types/domain';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import type { SnakeToCamelCase } from '../../../../common/types';
import { createRegisteredAttachmentUserActionBuilder } from './registered_attachments';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  'userAction' | 'attachmentTypeRegistry' | 'caseData' | 'handleDeleteComment' | 'userProfiles'
> & {
  attachment: SnakeToCamelCase<RegisteredAttachment>;
  isLoading: boolean;
};

export const createAttachmentUserActionBuilder = ({
  userAction,
  userProfiles,
  attachment,
  attachmentTypeRegistry,
  caseData,
  isLoading,
  handleDeleteComment,
}: BuilderArgs): ReturnType<UserActionBuilder> => {
  return createRegisteredAttachmentUserActionBuilder({
    userAction,
    userProfiles,
    attachment,
    registry: attachmentTypeRegistry,
    caseData,
    handleDeleteComment,
    isLoading,
    getId: () => attachment.type, // type IS the registry ID
    getAttachmentViewProps: () => ({
      attachmentId: attachment.attachmentId,
      metaData: attachment.metaData,
    }),
  });
};
