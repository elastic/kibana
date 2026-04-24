/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { AttachSavedObjectModal } from './attach_saved_object_modal';
import * as i18n from './translations';

export interface CaseViewAttachButtonProps {
  caseId: string;
  caseOwner: string;
  isDisabled?: boolean;
}

const CaseViewAttachButtonComponent: React.FC<CaseViewAttachButtonProps> = ({
  caseId,
  caseOwner,
  isDisabled,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  return (
    <>
      <EuiButton
        iconType="paperClip"
        onClick={openModal}
        isDisabled={isDisabled}
        data-test-subj="case-view-attach-button"
      >
        {i18n.ATTACH_BUTTON_LABEL}
      </EuiButton>
      {isModalOpen && (
        <AttachSavedObjectModal caseId={caseId} caseOwner={caseOwner} onClose={closeModal} />
      )}
    </>
  );
};

CaseViewAttachButtonComponent.displayName = 'CaseViewAttachButton';

export const CaseViewAttachButton = React.memo(CaseViewAttachButtonComponent);
