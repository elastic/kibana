/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import { useCasesContext } from '../../cases_context/use_cases_context';
import * as i18n from './translations';
import { UploadFileModal } from './upload_file_modal';
import type { AttachedFile } from './utils';

interface AddFileProps {
  caseId: string;
  existingFiles?: AttachedFile[];
}

const AddFileComponent: React.FC<AddFileProps> = ({ caseId, existingFiles }) => {
  const { permissions } = useCasesContext();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const closeModal = useCallback(() => setIsModalVisible(false), []);
  const showModal = useCallback(() => setIsModalVisible(true), []);

  if (!permissions.createComment) return null;

  return (
    <EuiFlexItem grow={false}>
      <EuiButton data-test-subj="cases-files-add" iconType="plusCircle" onClick={showModal}>
        {i18n.ADD_FILE}
      </EuiButton>
      {isModalVisible && (
        <UploadFileModal caseId={caseId} existingFiles={existingFiles} onClose={closeModal} />
      )}
    </EuiFlexItem>
  );
};

AddFileComponent.displayName = 'AddFile';

export const AddFile = React.memo(AddFileComponent);
