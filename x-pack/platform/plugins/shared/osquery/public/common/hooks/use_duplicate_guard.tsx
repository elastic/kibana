/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';

interface UseDuplicateGuardParams {
  copyMutation: { mutateAsync: () => Promise<unknown>; isLoading: boolean };
  resourceType: 'pack' | 'query';
}

export const useDuplicateGuard = ({ copyMutation, resourceType }: UseDuplicateGuardParams) => {
  const confirmModalTitleId = useGeneratedHtmlId();
  const bodyText = useMemo(
    () =>
      i18n.translate('xpack.osquery.duplicateConfirmation.body', {
        defaultMessage:
          'Your unsaved changes will be lost. The duplicate will be based on the last saved version of this {resourceType}.',
        values: { resourceType },
      }),
    [resourceType]
  );
  const [isDuplicateModalVisible, setIsDuplicateModalVisible] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);

  const handleDuplicateClick = useCallback(() => {
    if (isFormDirty) {
      setIsDuplicateModalVisible(true);
    } else {
      copyMutation.mutateAsync();
    }
  }, [copyMutation, isFormDirty]);

  const handleCloseDuplicateModal = useCallback(() => {
    setIsDuplicateModalVisible(false);
  }, []);

  const handleDuplicateConfirm = useCallback(() => {
    setIsDuplicateModalVisible(false);
    copyMutation.mutateAsync();
  }, [copyMutation]);

  const handleDirtyStateChange = useCallback((isDirty: boolean) => {
    setIsFormDirty(isDirty);
  }, []);

  const titleProps = useMemo(() => ({ id: confirmModalTitleId }), [confirmModalTitleId]);

  const duplicateModal = isDuplicateModalVisible ? (
    <EuiConfirmModal
      aria-labelledby={confirmModalTitleId}
      titleProps={titleProps}
      title={i18n.translate('xpack.osquery.duplicateConfirmation.title', {
        defaultMessage: 'You have unsaved changes',
      })}
      onCancel={handleCloseDuplicateModal}
      onConfirm={handleDuplicateConfirm}
      confirmButtonDisabled={copyMutation.isLoading}
      cancelButtonText={i18n.translate('xpack.osquery.duplicateConfirmation.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.osquery.duplicateConfirmation.confirmButtonLabel', {
        defaultMessage: 'Duplicate',
      })}
      defaultFocusedButton="cancel"
    >
      {bodyText}
    </EuiConfirmModal>
  ) : null;

  return {
    handleDuplicateClick,
    handleDirtyStateChange,
    duplicateModal,
  };
};
