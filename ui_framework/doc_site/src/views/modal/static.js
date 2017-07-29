import React from 'react';

import {
  KuiConfirmModal,
} from '../../../../components';

export const StaticConfirmModal = () => (
  <KuiConfirmModal
    onCancel={() => {}}
    onConfirm={() => {}}
    confirmButtonText="Confirm"
    cancelButtonText="Cancel"
    message="This is a confirmation modal"
    title="Confirm Modal Title"
  />
);
