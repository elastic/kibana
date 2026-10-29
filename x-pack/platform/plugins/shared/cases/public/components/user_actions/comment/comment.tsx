/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';
import { isEqual } from 'lodash';

import type { SnakeToCamelCase } from '../../../../common/types';
import type { CommentUserAction } from '../../../../common/types/domain';
import { UserActionActions } from '../../../../common/types/domain';
import { type AttachmentTypeRegistry } from '../../../../common/registry';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import type { AttachmentUIV2 } from '../../../../common/ui/types';
import { createCommonUpdateUserActionBuilder } from '../common';
import * as i18n from './translations';
import type { AddedReferences } from './unified_attachment';
import { createUnifiedAttachmentUserActionBuilder } from './unified_attachment';
import type { AttachmentType as AttachmentFrameworkAttachmentType } from '../../../client/attachment_framework/types';
import { COMMENT_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import {
  getReferenceAttachmentId,
  isLegacyAttachmentRequest,
  isUnifiedAttachmentRequest,
  isUnifiedReferenceAttachmentRequest,
  resolveUnifiedAttachmentType,
  toStringArray,
  toUnifiedAttachmentType,
} from '../../../../common/utils/attachments';

interface ActivityLabelArgs {
  userAction: SnakeToCamelCase<CommentUserAction>;
  caseData: UserActionBuilderArgs['caseData'];
  unifiedAttachmentTypeRegistry: UserActionBuilderArgs['unifiedAttachmentTypeRegistry'];
}

const getAttachmentTypeId = ({
  userAction,
  caseData,
}: Pick<ActivityLabelArgs, 'userAction' | 'caseData'>): string => {
  const owner = Array.isArray(caseData.owner) ? caseData.owner[0] : caseData.owner;
  return resolveUnifiedAttachmentType(userAction.payload.comment, owner);
};

const getUpdateLabelTitle = ({
  userAction,
  caseData,
  unifiedAttachmentTypeRegistry,
}: ActivityLabelArgs): string => {
  const { comment } = userAction.payload;
  const attachmentTypeId = getAttachmentTypeId({ userAction, caseData });

  if (attachmentTypeId === COMMENT_ATTACHMENT_TYPE) {
    return i18n.EDITED_COMMENT;
  }

  if (!unifiedAttachmentTypeRegistry.has(attachmentTypeId)) {
    return i18n.EDITED_ATTACHMENT;
  }

  const count = Math.max(toStringArray(getReferenceAttachmentId(comment)).length, 1);
  const countLabel = unifiedAttachmentTypeRegistry.get(attachmentTypeId).getCountLabel?.({ count });

  return countLabel != null ? i18n.EDITED_ATTACHMENTS(countLabel) : i18n.EDITED_ATTACHMENT;
};

const getDeleteLabelTitle = ({
  userAction,
  caseData,
  unifiedAttachmentTypeRegistry,
}: ActivityLabelArgs) => {
  const { comment } = userAction.payload;
  return getDeleteLabelFromRegistry({
    caseData,
    registry: unifiedAttachmentTypeRegistry,
    getId: () => getAttachmentTypeId({ userAction, caseData }),
    getAttachmentProps: () => ({
      savedObjectId: userAction.commentId ?? userAction.id,
      attachmentId: getReferenceAttachmentId(comment),
      metadata: 'metadata' in comment ? comment.metadata : undefined,
    }),
  });
};

interface GetDeleteLabelFromRegistryArgs {
  caseData: UserActionBuilderArgs['caseData'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registry: AttachmentTypeRegistry<AttachmentFrameworkAttachmentType<any>>;
  getId: () => string;
  getAttachmentProps: () => object;
}

const getDeleteLabelFromRegistry = ({
  caseData,
  registry,
  getId,
  getAttachmentProps,
}: GetDeleteLabelFromRegistryArgs) => {
  const registeredAttachmentCommonLabel = `${i18n.REMOVED_FIELD} ${i18n.ATTACHMENT.toLowerCase()}`;
  const attachmentTypeId: string = getId();
  const isTypeRegistered = registry.has(attachmentTypeId);

  if (!isTypeRegistered) {
    return registeredAttachmentCommonLabel;
  }

  const props = {
    ...getAttachmentProps(),
    caseData: { id: caseData.id, title: caseData.title },
  };

  const attachmentType = registry.get(attachmentTypeId);
  const attachmentLabel = attachmentType.getRemovalActivity?.(props).event ?? null;

  return attachmentLabel != null ? attachmentLabel : registeredAttachmentCommonLabel;
};

const getDeleteCommentUserAction = ({
  userAction,
  userProfiles,
  caseData,
  unifiedAttachmentTypeRegistry,
  handleOutlineComment,
}: {
  userAction: SnakeToCamelCase<CommentUserAction>;
} & Pick<
  UserActionBuilderArgs,
  'handleOutlineComment' | 'userProfiles' | 'unifiedAttachmentTypeRegistry' | 'caseData'
>): EuiCommentProps[] => {
  const label = getDeleteLabelTitle({
    userAction,
    caseData,
    unifiedAttachmentTypeRegistry,
  });

  const commonBuilder = createCommonUpdateUserActionBuilder({
    userAction,
    userProfiles,
    handleOutlineComment,
    label,
    icon: 'cross',
  });

  return commonBuilder.build();
};

const getCreateCommentUserAction = ({
  appId,
  userAction,
  userProfiles,
  caseData,
  unifiedAttachmentTypeRegistry,
  permissions,
  attachment,
  isDeleted,
  manageMarkdownEditIds,
  selectedOutlineCommentId,
  loadingCommentIds,
  euiTheme,
  handleDeleteComment,
  addedReferences,
}: {
  userAction: SnakeToCamelCase<CommentUserAction>;
  attachment: AttachmentUIV2;
  isDeleted: boolean;
  addedReferences?: AddedReferences;
} & Omit<
  UserActionBuilderArgs,
  'comments' | 'index' | 'handleOutlineComment' | 'currentUserProfile'
>): EuiCommentProps[] => {
  // External-reference / `actions` attachments are projected to their
  // unified shape by the cases server before reaching the client, so
  // legacy-shaped attachments have no client-side renderer.
  if (isLegacyAttachmentRequest(attachment)) {
    return [];
  }

  const type = toUnifiedAttachmentType(
    attachment.type,
    Array.isArray(caseData.owner) ? caseData.owner[0] : caseData.owner
  );
  const isUnified = isUnifiedAttachmentRequest(attachment);
  const registryHas = unifiedAttachmentTypeRegistry.has(type);

  if (isUnified && registryHas) {
    const unifiedBuilder = createUnifiedAttachmentUserActionBuilder({
      userAction,
      userProfiles,
      attachment,
      unifiedAttachmentTypeRegistry,
      permissions,
      caseData,
      isLoading: loadingCommentIds.includes(attachment.id),
      isDeleted,
      handleDeleteComment,
      manageMarkdownEditIds,
      selectedOutlineCommentId,
      loadingCommentIds,
      appId,
      euiTheme,
      addedReferences,
    });

    return unifiedBuilder.build();
  }

  return [];
};

/** Rebuilds a deleted attachment from its create user action payload. */
const buildAttachmentFromPayload = (
  userAction: SnakeToCamelCase<CommentUserAction>
): AttachmentUIV2 =>
  ({
    ...userAction.payload.comment,
    id: userAction.commentId ?? userAction.id,
    createdAt: userAction.createdAt,
    createdBy: userAction.createdBy,
    pushedAt: null,
    pushedBy: null,
    updatedAt: null,
    updatedBy: null,
    version: '',
  } as AttachmentUIV2);

/** Returns the ids the create user action added, when a partial removal dropped some of them. */
const getAddedReferences = (
  attachment: AttachmentUIV2,
  userAction: SnakeToCamelCase<CommentUserAction>
): AddedReferences | undefined => {
  const { comment } = userAction.payload;
  if (
    !isUnifiedReferenceAttachmentRequest(comment) ||
    !isUnifiedReferenceAttachmentRequest(attachment) ||
    isEqual(toStringArray(comment.attachmentId), toStringArray(attachment.attachmentId))
  ) {
    return undefined;
  }

  return { attachmentId: comment.attachmentId, metadata: comment.metadata };
};

export const createCommentUserActionBuilder: UserActionBuilder = ({
  appId,
  caseData,
  casesConfiguration,
  userProfiles,
  unifiedAttachmentTypeRegistry,
  permissions,
  userAction,
  manageMarkdownEditIds,
  selectedOutlineCommentId,
  loadingCommentIds,
  euiTheme,
  handleDeleteComment,
  handleOutlineComment,
  caseConnectors,
  attachments,
}) => ({
  build: () => {
    const attachmentUserAction = userAction as SnakeToCamelCase<CommentUserAction>;

    if (attachmentUserAction.action === UserActionActions.delete) {
      return getDeleteCommentUserAction({
        userAction: attachmentUserAction,
        caseData,
        handleOutlineComment,
        userProfiles,
        unifiedAttachmentTypeRegistry,
      });
    }

    if (attachmentUserAction.action === UserActionActions.create) {
      const liveAttachment = attachments.find((c) => c.id === attachmentUserAction.commentId);
      const isDeleted = liveAttachment == null;
      const attachment = liveAttachment ?? buildAttachmentFromPayload(attachmentUserAction);

      return getCreateCommentUserAction({
        addedReferences: liveAttachment
          ? getAddedReferences(liveAttachment, attachmentUserAction)
          : undefined,
        appId,
        caseData,
        casesConfiguration,
        userProfiles,
        userAction: attachmentUserAction,
        unifiedAttachmentTypeRegistry,
        permissions,
        attachment,
        isDeleted,
        manageMarkdownEditIds,
        selectedOutlineCommentId,
        loadingCommentIds,
        euiTheme,
        handleDeleteComment,
        caseConnectors,
        attachments,
      });
    }

    const label = getUpdateLabelTitle({
      userAction: attachmentUserAction,
      caseData,
      unifiedAttachmentTypeRegistry,
    });
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    return commonBuilder.build();
  },
});
