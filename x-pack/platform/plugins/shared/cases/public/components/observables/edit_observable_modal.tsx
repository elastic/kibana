/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiModal, EuiModalHeader, EuiModalHeaderTitle, EuiModalBody, useGeneratedHtmlId } from '@elastic/eui';
import React, { type FC } from 'react';
import type { ObservablePatch } from '../../../common/types/api/observable/v1';
import type { Observable } from '../../../common/types/domain/observable/v1';
import { ObservableForm } from './observable_form';
import * as i18n from './translations';
import { usePatchObservable } from '../../containers/use_patch_observables';
import { type CaseUI } from '../../containers/types';

export interface EditObservableModalProps {
  onCloseModal: VoidFunction;
  observable: Observable;
  caseData: CaseUI;
}

export const EditObservableModal: FC<EditObservableModalProps> = ({
  onCloseModal: closeModal,
  observable,
  caseData,
}) => {
  const modalTitleId = useGeneratedHtmlId();

  const { isLoading, mutateAsync: patchObservable } = usePatchObservable(
    caseData.id,
    observable.id
  );
  const handleUpdateObservable = async (updatedObservable: ObservablePatch) => {
    patchObservable({
      observable: updatedObservable,
    });
    closeModal();
  };

  return (
    <EuiModal data-test-subj="case-observables-edit-modal" onClose={closeModal} aria-labelledby={modalTitleId}>
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