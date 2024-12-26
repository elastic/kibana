/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PersistableStateAttachment } from '../../../../common/types/domain';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import type { SnakeToCamelCase } from '../../../../common/types';
import { createRegisteredAttachmentUserActionBuilder } from './registered_attachments';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  | 'userAction'
  | 'persistableStateAttachmentTypeRegistry'
  | 'caseData'
  | 'handleDeleteComment'
  | 'userProfiles'
> & {
  comment: SnakeToCamelCase<PersistableStateAttachment>;
  isLoading: boolean;
};

export const createPersistableStateAttachmentUserActionBuilder = ({
  userAction,
  userProfiles,
  comment,
  persistableStateAttachmentTypeRegistry,
  caseData,
  isLoading,
  handleDeleteComment,
}: BuilderArgs): ReturnType<UserActionBuilder> => {
  return createRegisteredAttachmentUserActionBuilder({
    userAction,
    userProfiles,
    comment,
    registry: persistableStateAttachmentTypeRegistry,
    caseData,
    handleDeleteComment,
    isLoading,
    getId: () => comment.persistableStateAttachmentTypeId,
    getAttachmentViewProps: () => ({
      persistableStateAttachmentTypeId: comment.persistableStateAttachmentTypeId,
      persistableStateAttachmentState: comment.persistableStateAttachmentState,
    }),
  });
};
