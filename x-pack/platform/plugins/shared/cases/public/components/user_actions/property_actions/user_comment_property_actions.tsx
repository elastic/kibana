/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiText } from '@elastic/eui';
import { AttachmentActionType } from '../../../client/attachment_framework/types';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useLensOpenVisualization } from '../../markdown_editor/plugins/lens/use_lens_open_visualization';
import * as i18n from './translations';
import { COPY_REFERENCE_LINK } from '../translations';
import { UserActionPropertyActions } from './property_actions';
import { DeleteAttachmentConfirmationModal } from '../delete_attachment_confirmation_modal';
import { useDeletePropertyAction } from './use_delete_property_action';
import { getDeleteWithRepliesBody } from '../../attachments/comment/translations';

interface Props {
  isLoading: boolean;
  commentContent?: string;
  onEdit: () => void;
  onDelete: () => void;
  onQuote: () => void;
  onCopyLink?: () => void;
  /** When above 0, the delete confirmation warns that the replies go too. */
  replyCount?: number;
  /** Hides the delete action, e.g. for comments posted by someone else. */
  canDelete?: boolean;
}

const UserCommentPropertyActionsComponent: React.FC<Props> = ({
  isLoading,
  commentContent,
  onEdit,
  onDelete,
  onQuote,
  onCopyLink,
  replyCount = 0,
  canDelete = true,
}) => {
  const { permissions } = useCasesContext();
  const { showDeletionModal, onModalOpen, onConfirm, onCancel } = useDeletePropertyAction({
    onDelete,
  });
  const buttonRef = React.useRef<HTMLAnchorElement>(null);

  const { canUseEditor, actionConfig } = useLensOpenVisualization({
    comment: commentContent ?? '',
  });

  const propertyActions = useMemo(() => {
    const showEditPencilIcon = permissions.update;
    const showTrashIcon = permissions.delete && canDelete;
    const showQuoteIcon = permissions.create;

    const showLensEditor = permissions.update && canUseEditor && actionConfig;

    return [
      ...(showEditPencilIcon
        ? [
            {
              type: AttachmentActionType.BUTTON as const,
              iconType: 'pencil',
              label: i18n.EDIT_COMMENT,
              onClick: onEdit,
            },
          ]
        : []),
      ...(showQuoteIcon
        ? [
            {
              type: AttachmentActionType.BUTTON as const,
              iconType: 'quote',
              label: i18n.QUOTE,
              onClick: onQuote,
            },
          ]
        : []),
      ...(onCopyLink != null
        ? [
            {
              type: AttachmentActionType.BUTTON as const,
              iconType: 'link',
              label: COPY_REFERENCE_LINK,
              onClick: onCopyLink,
            },
          ]
        : []),
      ...(showTrashIcon
        ? [
            {
              type: AttachmentActionType.BUTTON as const,
              iconType: 'trash',
              color: 'danger' as const,
              label: i18n.DELETE_COMMENT,
              onClick: onModalOpen,
            },
          ]
        : []),
      ...(showLensEditor ? [actionConfig] : []),
    ];
  }, [
    permissions.update,
    permissions.delete,
    permissions.create,
    canDelete,
    canUseEditor,
    actionConfig,
    onEdit,
    onModalOpen,
    onQuote,
    onCopyLink,
  ]);

  return (
    <>
      <UserActionPropertyActions
        isLoading={isLoading}
        propertyActions={propertyActions}
        buttonRef={buttonRef}
      />
      {showDeletionModal ? (
        <DeleteAttachmentConfirmationModal
          title={i18n.DELETE_COMMENT_TITLE}
          confirmButtonText={i18n.DELETE}
          onCancel={onCancel}
          onConfirm={onConfirm}
          focusButtonRef={buttonRef}
        >
          {replyCount > 0 ? (
            <EuiText size="s">{getDeleteWithRepliesBody(replyCount)}</EuiText>
          ) : null}
        </DeleteAttachmentConfirmationModal>
      ) : null}
    </>
  );
};

UserCommentPropertyActionsComponent.displayName = 'UserCommentPropertyActions';

export const UserCommentPropertyActions = React.memo(UserCommentPropertyActionsComponent);
