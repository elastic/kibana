/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';

import type { SnakeToCamelCase } from '../../../../common/types';
import type {
  CommentUserAction,
  RegisteredAttachment,
  AlertAttachmentPayload,
  ExternalReferenceAttachmentPayload,
  PersistableStateAttachmentPayload,
  UserCommentAttachment,
  AlertAttachment,
  EventAttachment,
  ActionsAttachment,
  ExternalReferenceAttachment,
  PersistableStateAttachment,
} from '../../../../common/types/domain';
import { UserActionActions, AttachmentType } from '../../../../common/types/domain';
import { type AttachmentTypeRegistry } from '../../../../common/registry';
import {
  isRegisteredAttachmentType,
  isCommentRequestTypeRegistered,
} from '../../../../common/utils/attachments';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { createCommonUpdateUserActionBuilder } from '../common';
import type { AttachmentUI } from '../../../containers/types';
import * as i18n from './translations';
import { createUserAttachmentUserActionBuilder } from './user';
import { createAlertAttachmentUserActionBuilder } from './alert';
import { createActionAttachmentUserActionBuilder } from './actions';
import { createExternalReferenceAttachmentUserActionBuilder } from './external_reference';
import { createAttachmentUserActionBuilder } from './new_attachment';
import { createPersistableStateAttachmentUserActionBuilder } from './persistable_state';
import type { AttachmentType as AttachmentFrameworkAttachmentType } from '../../../client/attachment_framework/types';
import { createEventAttachmentUserActionBuilder } from './event';

const getUpdateLabelTitle = () => `${i18n.EDITED_FIELD} ${i18n.COMMENT.toLowerCase()}`;

interface DeleteLabelTitle {
  userAction: SnakeToCamelCase<CommentUserAction>;
  caseData: UserActionBuilderArgs['caseData'];
  externalReferenceAttachmentTypeRegistry: UserActionBuilderArgs['externalReferenceAttachmentTypeRegistry'];
  attachmentTypeRegistry: UserActionBuilderArgs['attachmentTypeRegistry'];
  persistableStateAttachmentTypeRegistry: UserActionBuilderArgs['persistableStateAttachmentTypeRegistry'];
}

const getDeleteLabelTitle = ({
  userAction,
  caseData,
  externalReferenceAttachmentTypeRegistry,
  attachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
}: DeleteLabelTitle) => {
  const { comment } = userAction.payload;

  // Handle registered attachment types FIRST (type is the registry ID, not in enum)
  // This must be checked before enum values to properly narrow the type
  if (isCommentRequestTypeRegistered(comment)) {
    return getDeleteLabelFromRegistry({
      caseData,
      registry: attachmentTypeRegistry,
      getId: () => comment.type,
      getAttachmentProps: () => ({
        attachmentId: comment.attachmentId,
        metaData: comment.metaData,
      }),
    });
  }

  if (comment.type === AttachmentType.alert) {
    const alertComment = comment as AlertAttachmentPayload;
    const totalAlerts = Array.isArray(alertComment.alertId) ? alertComment.alertId.length : 1;
    const alertLabel = i18n.MULTIPLE_ALERTS(totalAlerts);

    return `${i18n.REMOVED_FIELD} ${alertLabel}`;
  }

  if (comment.type === AttachmentType.externalReference) {
    const externalRefComment = comment as ExternalReferenceAttachmentPayload;
    return getDeleteLabelFromRegistry({
      caseData,
      registry: externalReferenceAttachmentTypeRegistry,
      getId: () => externalRefComment.externalReferenceAttachmentTypeId,
      getAttachmentProps: () => ({
        externalReferenceId: externalRefComment.externalReferenceId,
        externalReferenceMetadata: externalRefComment.externalReferenceMetadata,
      }),
    });
  }

  if (comment.type === AttachmentType.persistableState) {
    const persistableComment = comment as PersistableStateAttachmentPayload;
    return getDeleteLabelFromRegistry({
      caseData,
      registry: persistableStateAttachmentTypeRegistry,
      getId: () => persistableComment.persistableStateAttachmentTypeId,
      getAttachmentProps: () => ({
        persistableStateAttachmentTypeId: persistableComment.persistableStateAttachmentTypeId,
        persistableStateAttachmentState: persistableComment.persistableStateAttachmentState,
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
  attachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
  handleOutlineComment,
}: {
  userAction: SnakeToCamelCase<CommentUserAction>;
} & Pick<
  UserActionBuilderArgs,
  | 'handleOutlineComment'
  | 'userProfiles'
  | 'externalReferenceAttachmentTypeRegistry'
  | 'attachmentTypeRegistry'
  | 'persistableStateAttachmentTypeRegistry'
  | 'caseData'
>): EuiCommentProps[] => {
  const label = getDeleteLabelTitle({
    userAction,
    caseData,
    externalReferenceAttachmentTypeRegistry,
    persistableStateAttachmentTypeRegistry,
    attachmentTypeRegistry,
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
  attachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
  attachment,
  commentRefs,
  manageMarkdownEditIds,
  selectedOutlineCommentId,
  loadingCommentIds,
  euiTheme,
  handleManageMarkdownEditId,
  handleSaveComment,
  handleManageQuote,
  handleDeleteComment,
  getRuleDetailsHref,
  loadingAlertData,
  onRuleDetailsClick,
  alertData,
  onShowAlertDetails,
  actionsNavigation,
}: {
  userAction: SnakeToCamelCase<CommentUserAction>;
  attachment: AttachmentUI;
} & Omit<
  UserActionBuilderArgs,
  'comments' | 'index' | 'handleOutlineComment' | 'currentUserProfile'
>): EuiCommentProps[] => {
  // Handle registered attachment types (type is the registry ID, not in enum)
  if (isRegisteredAttachmentType(attachment.type)) {
    // Type assertion: we know it's a RegisteredAttachment because type is not in enum
    const registeredAttachment = attachment as SnakeToCamelCase<RegisteredAttachment>;
    const registeredAttachmentBuilder = createAttachmentUserActionBuilder({
      userAction,
      userProfiles,
      attachment: registeredAttachment,
      attachmentTypeRegistry,
      caseData,
      isLoading: loadingCommentIds.includes(attachment.id),
      handleDeleteComment,
    });

    return registeredAttachmentBuilder.build();
  }

  switch (attachment.type) {
    case AttachmentType.user:
      const userAttachment = attachment as SnakeToCamelCase<UserCommentAttachment>;
      const userBuilder = createUserAttachmentUserActionBuilder({
        appId,
        userProfiles,
        attachment: userAttachment,
        outlined: attachment.id === selectedOutlineCommentId,
        isEdit: manageMarkdownEditIds.includes(attachment.id),
        commentRefs,
        isLoading: loadingCommentIds.includes(attachment.id),
        caseId: caseData.id,
        euiTheme,
        handleManageMarkdownEditId,
        handleSaveComment,
        handleManageQuote,
        handleDeleteComment,
      });

      return userBuilder.build();

    case AttachmentType.alert:
      const alertAttachment = attachment as SnakeToCamelCase<AlertAttachment>;
      const alertBuilder = createAlertAttachmentUserActionBuilder({
        userProfiles,
        alertData,
        attachment: alertAttachment,
        userAction,
        getRuleDetailsHref,
        loadingAlertData,
        onRuleDetailsClick,
        onShowAlertDetails,
        handleDeleteComment,
        loadingCommentIds,
      });

      return alertBuilder.build();

    case AttachmentType.event:
      const eventAttachment = attachment as SnakeToCamelCase<EventAttachment>;
      const eventBuilder = createEventAttachmentUserActionBuilder({
        userProfiles,
        attachment: eventAttachment,
        userAction,
        onShowAlertDetails,
        handleDeleteComment,
        loadingCommentIds,
      });

      return eventBuilder.build();

    case AttachmentType.actions:
      const actionsAttachment = attachment as SnakeToCamelCase<ActionsAttachment>;
      const actionBuilder = createActionAttachmentUserActionBuilder({
        userProfiles,
        userAction,
        attachment: actionsAttachment,
        actionsNavigation,
      });

      return actionBuilder.build();

    case AttachmentType.externalReference:
      const externalRefAttachment = attachment as SnakeToCamelCase<ExternalReferenceAttachment>;
      const externalReferenceBuilder = createExternalReferenceAttachmentUserActionBuilder({
        userAction,
        userProfiles,
        attachment: externalRefAttachment,
        externalReferenceAttachmentTypeRegistry,
        caseData,
        isLoading: loadingCommentIds.includes(attachment.id),
        handleDeleteComment,
      });

      return externalReferenceBuilder.build();

    case AttachmentType.persistableState:
      const persistableAttachment = attachment as SnakeToCamelCase<PersistableStateAttachment>;
      const persistableBuilder = createPersistableStateAttachmentUserActionBuilder({
        userAction,
        userProfiles,
        attachment: persistableAttachment,
        persistableStateAttachmentTypeRegistry,
        caseData,
        isLoading: loadingCommentIds.includes(attachment.id),
        handleDeleteComment,
      });

      return persistableBuilder.build();

    default:
      return [];
  }
};

export const createCommentUserActionBuilder: UserActionBuilder = ({
  appId,
  caseData,
  casesConfiguration,
  userProfiles,
  externalReferenceAttachmentTypeRegistry,
  attachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
  userAction,
  commentRefs,
  manageMarkdownEditIds,
  selectedOutlineCommentId,
  loadingCommentIds,
  loadingAlertData,
  alertData,
  euiTheme,
  getRuleDetailsHref,
  onRuleDetailsClick,
  onShowAlertDetails,
  handleManageMarkdownEditId,
  handleSaveComment,
  handleDeleteComment,
  handleManageQuote,
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
        attachmentTypeRegistry,
        persistableStateAttachmentTypeRegistry,
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
        attachmentTypeRegistry,
        persistableStateAttachmentTypeRegistry,
        attachment,
        commentRefs,
        manageMarkdownEditIds,
        selectedOutlineCommentId,
        loadingCommentIds,
        loadingAlertData,
        alertData,
        euiTheme,
        getRuleDetailsHref,
        onRuleDetailsClick,
        onShowAlertDetails,
        handleManageMarkdownEditId,
        handleSaveComment,
        handleDeleteComment,
        handleManageQuote,
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
