/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type {
  AttachmentRemovalOptions,
  AttachmentRemovalRequest,
  RegisteredUnifiedAttachmentType,
} from '../../../client/attachment_framework/types';
import { useBulkDeleteAttachments } from '../../../containers/use_bulk_delete_attachments';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { DeleteAttachmentConfirmationModal } from '../../user_actions/delete_attachment_confirmation_modal';
import { REMOVE } from '../../attachments/common/translations';
import { ATTACHMENTS_COUNT, REMOVE_ATTACHMENTS_TITLE } from './translations';

type RemovableAttachmentType = Pick<RegisteredUnifiedAttachmentType, 'getCountLabel'>;

interface PendingRemoval {
  attachmentType: RemovableAttachmentType;
  request: AttachmentRemovalRequest;
  options?: AttachmentRemovalOptions;
}

export type OnRemoveAttachments = (
  attachmentType: RemovableAttachmentType
) => (request: AttachmentRemovalRequest, options?: AttachmentRemovalOptions) => void;

const getCountLabel = ({ attachmentType, request }: PendingRemoval): string => {
  const count = request.savedObjectIds.length;
  return attachmentType.getCountLabel?.({ count }) ?? ATTACHMENTS_COUNT(count);
};

/** Confirms and removes attachments for the Attachments tab sections. */
export const useAttachmentRemoval = (
  caseId: string
): { canRemove: boolean; onRemove: OnRemoveAttachments; modal: React.ReactNode } => {
  const { permissions } = useCasesContext();
  const { mutate: bulkDeleteAttachments } = useBulkDeleteAttachments(caseId);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

  const onRemove = useCallback<OnRemoveAttachments>(
    (attachmentType) => (request, options) => {
      if (request.savedObjectIds.length > 0) {
        setPendingRemoval({ attachmentType, request, options });
      }
    },
    []
  );

  const onCancel = useCallback(() => setPendingRemoval(null), []);

  const onConfirm = useCallback(() => {
    if (pendingRemoval == null) {
      return;
    }

    const { request, options } = pendingRemoval;
    setPendingRemoval(null);
    bulkDeleteAttachments(
      {
        request: { ids: request.savedObjectIds },
        countLabel: getCountLabel(pendingRemoval),
      },
      { onSuccess: options?.onSuccess }
    );
  }, [pendingRemoval, bulkDeleteAttachments]);

  const modal =
    pendingRemoval != null ? (
      <DeleteAttachmentConfirmationModal
        title={REMOVE_ATTACHMENTS_TITLE(getCountLabel(pendingRemoval))}
        confirmButtonText={REMOVE}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    ) : null;

  return { canRemove: permissions.delete, onRemove, modal };
};
