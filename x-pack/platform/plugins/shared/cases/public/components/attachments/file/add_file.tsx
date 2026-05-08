/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import { useCreateAttachments } from '../../../containers/use_create_attachments';
import { useCasesContext } from '../../cases_context/use_cases_context';
import * as i18n from './translations';
import { UploadFileModal } from './upload_file_modal';

interface AddFileProps {
  caseId: string;
}

const AddFileComponent: React.FC<AddFileProps> = ({ caseId }) => {
  const { permissions } = useCasesContext();
  const { isLoading } = useCreateAttachments();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const closeModal = useCallback(() => setIsModalVisible(false), []);
  const showModal = useCallback(() => setIsModalVisible(true), []);

  if (!permissions.createComment) return null;

  return (
    <EuiFlexItem grow={false}>
      <EuiButton
        data-test-subj="cases-files-add"
        iconType="plusCircle"
        isDisabled={isLoading}
        isLoading={isLoading}
        onClick={showModal}
      >
        {i18n.ADD_FILE}
      </EuiButton>
      {isModalVisible && <UploadFileModal caseId={caseId} onClose={closeModal} />}
    </EuiFlexItem>
  );
};

AddFileComponent.displayName = 'AddFile';

export const AddFile = React.memo(AddFileComponent);
