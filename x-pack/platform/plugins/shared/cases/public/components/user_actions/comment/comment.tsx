/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';

import type { SnakeToCamelCase } from '../../../../common/types';
import type { CommentUserAction } from '../../../../common/types/domain';
import { UserActionActions } from '../../../../common/types/domain';
import { type AttachmentTypeRegistry } from '../../../../common/registry';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import type { AttachmentUIV2 } from '../../../../common/ui/types';
import { createCommonUpdateUserActionBuilder } from '../common';
import * as i18n from './translations';
import { createUnifiedAttachmentUserActionBuilder } from './unified_attachment';
import type { AttachmentType as AttachmentFrameworkAttachmentType } from '../../../client/attachment_framework/types';
import {
  getReferenceAttachmentId,
  isLegacyAttachmentRequest,
  isUnifiedAttachmentRequest,
  resolveUnifiedAttachmentType,
  toUnifiedAttachmentType,
} from '../../../../common/utils/attachments';

const getUpdateLabelTitle = () => `${i18n.EDITED_FIELD} ${i18n.COMMENT.toLowerCase()}`;

interface DeleteLabelTitle {
  userAction: SnakeToCamelCase<CommentUserAction>;
  caseData: UserActionBuilderArgs['caseData'];
  unifiedAttachmentTypeRegistry: UserActionBuilderArgs['unifiedAttachmentTypeRegistry'];
}

const getDeleteLabelTitle = ({
  userAction,
  caseData,
  unifiedAttachmentTypeRegistry,
}: DeleteLabelTitle) => {
  const { comment } = userAction.payload;
  const owner = Array.isArray(caseData.owner) ? caseData.owner[0] : caseData.owner;
  return getDeleteLabelFromRegistry({
    caseData,
    registry: unifiedAttachmentTypeRegistry,
    getId: () => resolveUnifiedAttachmentType(comment, owner),
    getAttachmentProps: () => ({
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
}: {
  userAction: SnakeToCamelCase<CommentUserAction>;
  attachment: AttachmentUIV2;
  isDeleted: boolean;
} & Omit<
  UserActionBuilderArgs,
  'comments' | 'index' | 'handleOutlineComment' | 'currentUserProfile'
>): EuiCommentProps[] => {
  // Migrated external-reference / `actions` attachments are projected to their
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
    });

    return unifiedBuilder.build();
  }

  return [];
};

/**
 * Stands in for a deleted attachment saved object so the create row still renders
 * through the normal live-attachment path instead of being dropped. The user action
 * payload is the original create request, so it already has everything the
 * registered type needs (`data`, `attachmentId`, `metadata`) — only the saved-object
 * bookkeeping fields are missing and are filled in from the user action itself.
 * See #19036.
 */
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
      // If the attachment saved object is gone, un-hide the row by standing in
      // with the payload and render it read-only (no edit/delete/view on a
      // deleted saved object) — see #19036.
      const liveAttachment = attachments.find((c) => c.id === attachmentUserAction.commentId);
      const isDeleted = liveAttachment == null;
      const attachment = liveAttachment ?? buildAttachmentFromPayload(attachmentUserAction);

      return getCreateCommentUserAction({
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

    // `update` (edited comment) does not need the live attachment: the payload
    // is self-contained, so this must not be gated on the SO still existing.
    const label = getUpdateLabelTitle();
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
