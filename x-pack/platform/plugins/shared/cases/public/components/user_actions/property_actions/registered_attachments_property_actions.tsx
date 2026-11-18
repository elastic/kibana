/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type {
  AttachmentAction,
  RelatedRemovalChoice,
  RelatedRemovalOptions,
} from '../../../client/attachment_framework/types';

import { AttachmentActionType } from '../../../client/attachment_framework/types';
import { useCasesContext } from '../../cases_context/use_cases_context';
import * as i18n from './translations';
import { UserActionPropertyActions } from './property_actions';
import { DeleteAttachmentConfirmationModal } from '../delete_attachment_confirmation_modal';
import { RemoveWithRelatedConfirmationModal } from '../remove_with_related_confirmation_modal';
import { useDeletePropertyAction } from './use_delete_property_action';

interface Props {
  isLoading: boolean;
  registeredAttachmentActions: AttachmentAction[];
  onDelete: (options?: RelatedRemovalOptions) => void;
  hideDefaultActions: boolean;
  /** Offers to keep the attachments the deletion would also remove. */
  relatedRemoval?: RelatedRemovalChoice;
}

const RegisteredAttachmentsPropertyActionsComponent: React.FC<Props> = ({
  isLoading,
  registeredAttachmentActions,
  onDelete,
  hideDefaultActions,
  relatedRemoval,
}) => {
  const { permissions } = useCasesContext();
  const { showDeletionModal, onModalOpen, onConfirm, onConfirmWithOptions, onCancel } =
    useDeletePropertyAction<RelatedRemovalOptions>({ onDelete });
  const buttonRef = React.useRef<HTMLAnchorElement>(null);

  const propertyActions = useMemo(() => {
    const showTrashIcon = permissions.delete && !hideDefaultActions;

    return [
      ...(showTrashIcon
        ? [
            {
              type: AttachmentActionType.BUTTON as const,
              disabled: false,
              iconType: 'trash',
              color: 'danger' as const,
              label: i18n.DELETE_ATTACHMENT,
              onClick: onModalOpen,
            },
          ]
        : []),
      ...registeredAttachmentActions,
    ];
  }, [permissions.delete, hideDefaultActions, onModalOpen, registeredAttachmentActions]);

  const renderModal = (): React.ReactNode => {
    if (!showDeletionModal) {
      return null;
    }

    return relatedRemoval != null ? (
      <RemoveWithRelatedConfirmationModal
        title={i18n.REMOVE_ATTACHMENT}
        relatedRemoval={relatedRemoval}
        onCancel={onCancel}
        onConfirm={onConfirmWithOptions}
        focusButtonRef={buttonRef}
      />
    ) : (
      <DeleteAttachmentConfirmationModal
        title={i18n.DELETE_ATTACHMENT}
        confirmButtonText={i18n.DELETE}
        onCancel={onCancel}
        onConfirm={onConfirm}
        focusButtonRef={buttonRef}
      />
    );
  };

  return (
    <>
      <UserActionPropertyActions
        isLoading={isLoading}
        propertyActions={propertyActions}
        buttonRef={buttonRef}
      />
      {renderModal()}
    </>
  );
};

RegisteredAttachmentsPropertyActionsComponent.displayName = 'RegisteredAttachmentsPropertyActions';

export const RegisteredAttachmentsPropertyActions = React.memo(
  RegisteredAttachmentsPropertyActionsComponent
);
