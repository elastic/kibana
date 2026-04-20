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
import { createAlertAttachmentUserActionBuilder } from '../../attachments/alert/alert';
import { createActionAttachmentUserActionBuilder } from '../../attachments/host_isolation/actions';
import { createExternalReferenceAttachmentUserActionBuilder } from './external_reference';
import type { AttachmentType as AttachmentFrameworkAttachmentType } from '../../../client/attachment_framework/types';
import {
  isLegacyAttachmentRequest,
  isUnifiedAttachmentRequest,
  isUnifiedReferenceAttachmentRequest,
  toUnifiedAttachmentType,
} from '../../../../common/utils/attachments';

const getUpdateLabelTitle = () => `${i18n.EDITED_FIELD} ${i18n.COMMENT.toLowerCase()}`;

interface DeleteLabelTitle {
  userAction: SnakeToCamelCase<CommentUserAction>;
  caseData: UserActionBuilderArgs['caseData'];
  externalReferenceAttachmentTypeRegistry: UserActionBuilderArgs['externalReferenceAttachmentTypeRegistry'];
  unifiedAttachmentTypeRegistry: UserActionBuilderArgs['unifiedAttachmentTypeRegistry'];
}

const getDeleteLabelTitle = ({
  userAction,
  caseData,
  externalReferenceAttachmentTypeRegistry,
  unifiedAttachmentTypeRegistry,
}: DeleteLabelTitle) => {
  const { comment } = userAction.payload;
  const owner = Array.isArray(caseData.owner) ? caseData.owner[0] : caseData.owner;
  if (isLegacyAttachmentRequest(comment)) {
    if (comment.type === AttachmentType.alert) {
      const totalAlerts = Array.isArray(comment.alertId) ? comment.alertId.length : 1;
      const alertLabel = i18n.MULTIPLE_ALERTS(totalAlerts);

      return `${i18n.REMOVED_FIELD} ${alertLabel}`;
    }

    if (comment.type === AttachmentType.externalReference) {
      return getDeleteLabelFromRegistry({
        caseData,
        registry: externalReferenceAttachmentTypeRegistry,
        getId: () => comment.externalReferenceAttachmentTypeId,
        getAttachmentProps: () => ({
          externalReferenceId: comment.externalReferenceId,
          externalReferenceMetadata: comment.externalReferenceMetadata,
        }),
      });
    }
  }
  if (isUnifiedReferenceAttachmentRequest(comment)) {
    return getDeleteLabelFromRegistry({
      caseData,
      registry: unifiedAttachmentTypeRegistry,
      getId: () => toUnifiedAttachmentType(comment.type, owner),
      getAttachmentProps: () => ({
        attachmentId: comment.attachmentId,
        metadata: comment.metadata,
      }),
    });
  }

  return `${i18n.REMOVED_FIELD} ${i18n.COMMENT.toLowerCase()}`;
};

interface GetDeleteLabelFromRegistryArgs<R> {
  caseData: UserActionBuilderArgs['caseData'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registry: AttachmentTypeRegistry<AttachmentFrameworkAttachmentType<any>>;
  getId: () => string;
  getAttachmentProps: () => object;
}

const getDeleteLabelFromRegistry = <R,>({
  caseData,
  registry,
  getId,
  getAttachmentProps,
}: GetDeleteLabelFromRegistryArgs<R>) => {
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
  externalReferenceAttachmentTypeRegistry,
  unifiedAttachmentTypeRegistry,
  handleOutlineComment,
}: {
  userAction: SnakeToCamelCase<CommentUserAction>;
} & Pick<
  UserActionBuilderArgs,
  | 'handleOutlineComment'
  | 'userProfiles'
  | 'externalReferenceAttachmentTypeRegistry'
  | 'unifiedAttachmentTypeRegistry'
  | 'caseData'
>): EuiCommentProps[] => {
  const label = getDeleteLabelTitle({
    userAction,
    caseData,
    externalReferenceAttachmentTypeRegistry,
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
  getRuleDetailsHref,
  loadingAlertData,
  onRuleDetailsClick,
  alertData,
  onShowAlertDetails,
  actionsNavigation,
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
    switch (attachment.type) {
      case AttachmentType.alert:
        const alertBuilder = createAlertAttachmentUserActionBuilder({
          userProfiles,
          alertData,
          attachment,
          userAction,
          getRuleDetailsHref,
          loadingAlertData,
          onRuleDetailsClick,
          onShowAlertDetails,
          handleDeleteComment,
          loadingCommentIds,
        });

        return alertBuilder.build();

      case AttachmentType.actions:
        const actionBuilder = createActionAttachmentUserActionBuilder({
          userProfiles,
          userAction,
          attachment,
          actionsNavigation,
        });

        return actionBuilder.build();

      case AttachmentType.externalReference:
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

      default:
        return [];
    }
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
  loadingAlertData,
  alertData,
  euiTheme,
  getRuleDetailsHref,
  onRuleDetailsClick,
  onShowAlertDetails,
  handleDeleteComment,
  handleOutlineComment,
  actionsNavigation,
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
        externalReferenceAttachmentTypeRegistry,
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
        loadingAlertData,
        alertData,
        euiTheme,
        getRuleDetailsHref,
        onRuleDetailsClick,
        onShowAlertDetails,
        handleDeleteComment,
        actionsNavigation,
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
