/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import type { SnakeToCamelCase } from '../../../../common/types';
import type { UnifiedAttachment } from '../../../../common/types/domain';
import { createRegisteredAttachmentUserActionBuilder } from './registered_attachments';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  | 'userAction'
  | 'unifiedAttachmentTypeRegistry'
  | 'caseData'
  | 'handleDeleteComment'
  | 'userProfiles'
> & {
  attachment: SnakeToCamelCase<UnifiedAttachment>;
  isLoading: boolean;
};

export const createUnifiedValueAttachmentUserActionBuilder = ({
  userAction,
  userProfiles,
  attachment,
  unifiedAttachmentTypeRegistry,
  caseData,
  isLoading,
  handleDeleteComment,
}: BuilderArgs): ReturnType<UserActionBuilder> => {
  return createRegisteredAttachmentUserActionBuilder({
    userAction,
    userProfiles,
    attachment,
    registry: unifiedAttachmentTypeRegistry,
    caseData,
    handleDeleteComment,
    isLoading,
    getId: () => attachment.type,
    getAttachmentViewProps: () => ({
      data: (attachment as unknown as { data: Record<string, unknown> }).data ?? {},
      metadata: (attachment as unknown as { metadata?: Record<string, unknown> }).metadata,
    }),
  });
};
