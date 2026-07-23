/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';

import type { SnakeToCamelCase } from '../../../../common/types';
import type { CommentUserAction } from '../../../../common/types/domain';
import { UserActionActions, AttachmentType } from '../../../../common/types/domain';
import { type AttachmentTypeRegistry } from '../../../../common/registry';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import type { AttachmentUIV2 } from '../../../../common/ui/types';
import { createCommonUpdateUserActionBuilder } from '../common';
import * as i18n from './translations';
import { createUnifiedAttachmentUserActionBuilder } from './unified_attachment';
import { createExternalReferenceAttachmentUserActionBuilder } from './external_reference';
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
  const attachmentLabel = attachmentType.getAttachmentRemovalObject?.(props).event ?? null;

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
  externalReferenceAttachmentTypeRegistry,
  unifiedAttachmentTypeRegistry,
  attachment,
  manageMarkdownEditIds,
  selectedOutlineCommentId,
  loadingCommentIds,
  euiTheme,
  handleDeleteComment,
}: {
  userAction: SnakeToCamelCase<CommentUserAction>;
  attachment: AttachmentUIV2;
} & Omit<
  UserActionBuilderArgs,
  | 'comments'
  | 'index'
  | 'handleOutlineComment'
  | 'currentUserProfile'
  | 'persistableStateAttachmentTypeRegistry'
>): EuiCommentProps[] => {
  if (isLegacyAttachmentRequest(attachment)) {
    // Legacy `actions` attachments are projected to the unified `security.endpoint`
    // type by the cases server before reaching the client (UI reads always use
    // `mode: 'unified'`), so they fall through to the unified branch below
    // rather than needing a dedicated cases-side renderer.
    if (attachment.type === AttachmentType.externalReference) {
      const externalReferenceBuilder = createExternalReferenceAttachmentUserActionBuilder({
        userAction,
        userProfiles,
        attachment,
        externalReferenceAttachmentTypeRegistry,
        caseData,
        isLoading: loadingCommentIds.includes(attachment.id),
        handleDeleteComment,
      });

      return externalReferenceBuilder.build();
    }
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
      caseData,
      isLoading: loadingCommentIds.includes(attachment.id),
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

export const createCommentUserActionBuilder: UserActionBuilder = ({
  appId,
  caseData,
  casesConfiguration,
  userProfiles,
  externalReferenceAttachmentTypeRegistry,
  unifiedAttachmentTypeRegistry,
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

    const attachment = attachments.find((c) => c.id === attachmentUserAction.commentId);

    if (attachment == null) {
      return [];
    }
    if (attachmentUserAction.action === UserActionActions.create) {
      const commentAction = getCreateCommentUserAction({
        appId,
        caseData,
        casesConfiguration,
        userProfiles,
        userAction: attachmentUserAction,
        externalReferenceAttachmentTypeRegistry,
        unifiedAttachmentTypeRegistry,
        attachment,
        manageMarkdownEditIds,
        selectedOutlineCommentId,
        loadingCommentIds,
        euiTheme,
        handleDeleteComment,
        caseConnectors,
        attachments,
      });

      return commentAction;
    }

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
