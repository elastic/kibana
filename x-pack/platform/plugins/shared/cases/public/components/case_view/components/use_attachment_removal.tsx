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
  RelatedRemovalOptions,
} from '../../../client/attachment_framework/types';
import { useBulkDeleteAttachments } from '../../../containers/use_bulk_delete_attachments';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { DeleteAttachmentConfirmationModal } from '../../user_actions/delete_attachment_confirmation_modal';
import { RemoveWithRelatedConfirmationModal } from '../../user_actions/remove_with_related_confirmation_modal';
import { REMOVE } from '../../attachments/common/translations';
import { ATTACHMENTS_COUNT, REMOVE_ATTACHMENTS_TITLE } from './translations';

type RemovableAttachmentType = Pick<
  RegisteredUnifiedAttachmentType,
  'id' | 'getCountLabel' | 'getRelatedRemoval'
>;

interface PendingRemoval {
  attachmentType: RemovableAttachmentType;
  request: AttachmentRemovalRequest;
  options?: AttachmentRemovalOptions;
}

export type OnRemoveAttachments = (
  attachmentType: RemovableAttachmentType
) => (request: AttachmentRemovalRequest, options?: AttachmentRemovalOptions) => void;

const getCount = (request: AttachmentRemovalRequest): number =>
  'savedObjectIds' in request ? request.savedObjectIds.length : request.attachmentIds.length;

const getCountLabel = ({ attachmentType, request }: PendingRemoval): string => {
  const count = getCount(request);
  return attachmentType.getCountLabel?.({ count }) ?? ATTACHMENTS_COUNT(count);
};

/** Confirms and removes attachments for the Attachments tab sections. */
export const useAttachmentRemoval = (
  caseId: string
): {
  canRemove: boolean;
  onRemove: OnRemoveAttachments;
  isRemoving: boolean;
  modal: React.ReactNode;
} => {
  const { permissions } = useCasesContext();
  const { mutate: bulkDeleteAttachments, isLoading: isRemoving } = useBulkDeleteAttachments(caseId);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

  const onRemove = useCallback<OnRemoveAttachments>(
    (attachmentType) => (request, options) => {
      if (!isRemoving && getCount(request) > 0) {
        setPendingRemoval({ attachmentType, request, options });
      }
    },
    [isRemoving]
  );

  const onCancel = useCallback(() => setPendingRemoval(null), []);

  const remove = useCallback(
    (includeRelated?: boolean) => {
      if (pendingRemoval == null || isRemoving) {
        return;
      }

      const { attachmentType, request, options } = pendingRemoval;
      setPendingRemoval(null);
      bulkDeleteAttachments(
        {
          request:
            'savedObjectIds' in request
              ? { ids: request.savedObjectIds }
              : { type: attachmentType.id, attachmentIds: request.attachmentIds },
          countLabel: getCountLabel(pendingRemoval),
          includeRelated,
        },
        { onSuccess: options?.onSuccess }
      );
    },
    [pendingRemoval, isRemoving, bulkDeleteAttachments]
  );

  const onConfirm = useCallback(() => remove(), [remove]);
  const onConfirmRelated = useCallback(
    ({ includeRelated }: RelatedRemovalOptions) => remove(includeRelated),
    [remove]
  );

  const renderModal = (): React.ReactNode => {
    if (pendingRemoval == null) {
      return null;
    }

    const title = REMOVE_ATTACHMENTS_TITLE(getCountLabel(pendingRemoval));
    const relatedRemoval = pendingRemoval.attachmentType.getRelatedRemoval?.({
      count: getCount(pendingRemoval.request),
    });

    return relatedRemoval != null ? (
      <RemoveWithRelatedConfirmationModal
        title={title}
        relatedRemoval={relatedRemoval}
        onConfirm={onConfirmRelated}
        onCancel={onCancel}
      />
    ) : (
      <DeleteAttachmentConfirmationModal
        title={title}
        confirmButtonText={REMOVE}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  };

  const modal = renderModal();

  return { canRemove: permissions.delete, onRemove, isRemoving, modal };
};
