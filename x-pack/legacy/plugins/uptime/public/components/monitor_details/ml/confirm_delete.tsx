/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiOverlayMask, EuiConfirmModal, EuiLoadingSpinner } from '@elastic/eui';

interface Props {
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmJobDeletion: React.FC<Props> = ({ open, loading, onConfirm, onCancel }) => {
  const [inProgress, setInProgress] = useState(false);

  if (!open) {
    return null;
  }

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title="Delete Anomaly detection job?"
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText="Cancel"
        confirmButtonText="Delete"
        buttonColor="danger"
        defaultFocusedButton="confirm"
      >
        {!loading ? <p>Are you sure you want to delete this job?</p> : <p>Deleting jobs...</p>}
        {!loading ? (
          <p>
            Deleting a job can be time consuming. It will be deleted in the background and data may
            not disappear instantly.
          </p>
        ) : (
          <EuiLoadingSpinner size="xl" />
        )}
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
