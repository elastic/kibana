/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { DatasetSharedNotice, type SharedDatasetAction } from './dataset_shared_notice';
import { useDatasetSharing } from './use_dataset_sharing';
import * as i18n from './translations';

interface SharedChangeConfirmModalProps {
  spaceIds?: string[];
  action: Extract<SharedDatasetAction, 'edit-dataset' | 'edit-example'>;
  /** Spaces the edit takes the dataset out of, losing access rather than changing content. */
  removedSpaceIds?: string[];
  /** What it will be assigned to instead, to say what a narrowing leaves behind. */
  nextSpaceIds?: string[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Asks before an edit lands in other spaces, where someone else would see it
 * change under them.
 */
export const SharedChangeConfirmModal: React.FC<SharedChangeConfirmModalProps> = ({
  spaceIds,
  action,
  removedSpaceIds,
  nextSpaceIds,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  const { spaceNamesFor } = useDatasetSharing(spaceIds);
  const removedSpaceNames = spaceNamesFor(removedSpaceIds ?? []);
  const isRemoving = removedSpaceNames.length > 0;
  const title = isRemoving
    ? i18n.CONFIRM_REMOVE_SPACES_TITLE
    : action === 'edit-dataset'
    ? i18n.CONFIRM_EDIT_DATASET_TITLE
    : i18n.CONFIRM_EDIT_EXAMPLE_TITLE;

  return (
    <EuiConfirmModal
      aria-label={title}
      title={title}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.CONFIRM_CANCEL_BUTTON}
      confirmButtonText={i18n.CONFIRM_SAVE_BUTTON}
      confirmButtonDisabled={isLoading}
      isLoading={isLoading}
      buttonColor={isRemoving ? 'danger' : 'primary'}
      defaultFocusedButton="cancel"
      data-test-subj="datasetSharedChangeConfirmModal"
    >
      {isRemoving ? (
        <>
          <KbnDangerCallout
            announceOnMount
            size="s"
            title={i18n.REMOVED_SPACES_TITLE}
            text={<p>{i18n.getRemovedSpacesMessage(removedSpaceNames)}</p>}
            data-test-subj="datasetRemovedSpacesNotice"
          />
          <EuiSpacer size="m" />
        </>
      ) : null}
      <DatasetSharedNotice
        spaceIds={isRemoving ? nextSpaceIds ?? spaceIds : spaceIds}
        action={action}
      />
    </EuiConfirmModal>
  );
};
