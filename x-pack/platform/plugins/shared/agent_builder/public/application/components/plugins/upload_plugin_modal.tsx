/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { EuiFilePickerProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFilePicker,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { labels } from '../../utils/i18n';
import { useUploadPlugin } from '../../hooks/plugins/use_install_plugin';

interface UploadPluginModalProps {
  onClose: () => void;
}

export const UploadPluginModal: React.FC<UploadPluginModalProps> = ({ onClose }) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'uploadPluginModal' });
  const [file, setFile] = useState<File | null>(null);

  const { uploadPlugin, isLoading } = useUploadPlugin({
    onSuccess: () => onClose(),
  });

  const handleFileChange: EuiFilePickerProps['onChange'] = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      setFile(files[0]);
    } else {
      setFile(null);
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file) return;
      await uploadPlugin({ file });
    },
    [file, uploadPlugin]
  );

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {labels.plugins.uploadPluginModalTitle}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm id="uploadPluginForm" component="form" onSubmit={handleSubmit}>
          <EuiFormRow label={labels.plugins.fileFieldLabel} fullWidth>
            <EuiFilePicker
              onChange={handleFileChange}
              accept=".zip"
              fullWidth
              disabled={isLoading}
              data-test-subj="agentBuilderUploadPluginFilePicker"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} disabled={isLoading}>
          {labels.plugins.cancelButton}
        </EuiButtonEmpty>
        <EuiButton
          type="submit"
          form="uploadPluginForm"
          fill
          isLoading={isLoading}
          disabled={!file}
          data-test-subj="agentBuilderUploadPluginSubmitButton"
        >
          {labels.plugins.installButton}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
