/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { type FC } from 'react';
import type { ObservablePatch } from '../../../common/types/api/observable/v1';
import { ObservableForm } from './observable_form';
import * as i18n from './translations';
import { usePatchObservable } from '../../containers/use_patch_observables';
import { type CaseUI } from '../../containers/types';
import type { ObservableWithMetadata } from '../../../common/types/api';

export interface EditObservableModalProps {
  onCloseModal: VoidFunction;
  observable: ObservableWithMetadata;
  caseData: CaseUI;
  /** Called once the change is saved, after the modal has closed. */
  onObservableUpdated?: (patch: ObservablePatch) => void;
}

export const EditObservableModal: FC<EditObservableModalProps> = ({
  onCloseModal: closeModal,
  observable,
  caseData,
  onObservableUpdated,
}) => {
  const modalTitleId = useGeneratedHtmlId();

  const { isLoading, mutateAsync: patchObservable } = usePatchObservable(
    caseData.id,
    observable.id
  );
  // The save button spins until the update settles. The modal closes only once it is saved, and
  // stays open on an error (the mutation shows it in a toast) so the user can retry.
  const handleUpdateObservable = async (updatedObservable: ObservablePatch) => {
    try {
      await patchObservable({ observable: updatedObservable });
    } catch {
      return;
    }
    closeModal();
    onObservableUpdated?.(updatedObservable);
  };

  return (
    <EuiModal
      data-test-subj="case-observables-edit-modal"
      onClose={closeModal}
      aria-labelledby={modalTitleId}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{i18n.EDIT_OBSERVABLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <ObservableForm
          onCancel={closeModal}
          observable={observable}
          isLoading={isLoading}
          onSubmit={handleUpdateObservable}
        />
      </EuiModalBody>
    </EuiModal>
  );
};

EditObservableModal.displayName = 'EditObservableModal';
