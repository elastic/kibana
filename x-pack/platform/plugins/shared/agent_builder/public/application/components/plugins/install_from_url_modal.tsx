/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
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
import { useInstallPluginFromUrl } from '../../hooks/plugins/use_install_plugin';

interface InstallFromUrlModalProps {
  onClose: () => void;
}

export const InstallFromUrlModal: React.FC<InstallFromUrlModalProps> = ({ onClose }) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'installFromUrlModal' });
  const [url, setUrl] = useState('');

  const { installFromUrl, isLoading } = useInstallPluginFromUrl({
    onSuccess: () => onClose(),
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!url.trim()) return;
      await installFromUrl({ url: url.trim() });
    },
    [url, installFromUrl]
  );

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {labels.plugins.installFromUrlModalTitle}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm id="installFromUrlForm" component="form" onSubmit={handleSubmit}>
          <EuiFormRow label={labels.plugins.urlFieldLabel} fullWidth>
            <EuiFieldText
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={labels.plugins.urlFieldPlaceholder}
              fullWidth
              disabled={isLoading}
              data-test-subj="agentBuilderInstallPluginUrlField"
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
          form="installFromUrlForm"
          fill
          isLoading={isLoading}
          disabled={!url.trim()}
          data-test-subj="agentBuilderInstallPluginSubmitButton"
        >
          {labels.plugins.installButton}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
