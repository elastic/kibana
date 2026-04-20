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
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiTab,
  EuiTabs,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { PluginDefinition } from '@kbn/agent-builder-common';
import { labels } from '../../../utils/i18n';
import {
  useInstallPluginFromUrl,
  useUploadPlugin,
} from '../../../hooks/plugins/use_install_plugin';

type InstallTab = 'url' | 'upload';

interface InstallPluginFlyoutProps {
  onClose: () => void;
  /** Called after a plugin is successfully installed, receives the new plugin data.
   *  May return a promise — the flyout waits for it to settle before closing. */
  onPluginInstalled?: (plugin: PluginDefinition) => void | Promise<void>;
}

export const InstallPluginFlyout: React.FC<InstallPluginFlyoutProps> = ({
  onClose,
  onPluginInstalled,
}) => {
  const [activeTab, setActiveTab] = useState<InstallTab>('url');
  const { euiTheme } = useEuiTheme();
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleInstallSuccess = useCallback(
    async (data: PluginDefinition) => {
      try {
        await onPluginInstalled?.(data);
      } finally {
        onClose();
      }
    },
    [onPluginInstalled, onClose]
  );

  const { installFromUrl, isLoading: isUrlLoading } = useInstallPluginFromUrl({
    onSuccess: handleInstallSuccess,
  });

  const { uploadPlugin, isLoading: isUploadLoading } = useUploadPlugin({
    onSuccess: handleInstallSuccess,
  });

  const isLoading = isUrlLoading || isUploadLoading;

  const handleUrlSubmit = useCallback(async () => {
    if (!url.trim()) return;
    await installFromUrl({ url: url.trim() });
  }, [url, installFromUrl]);

  const handleUploadSubmit = useCallback(async () => {
    if (!file) return;
    await uploadPlugin({ file });
  }, [file, uploadPlugin]);

  const handleInstall = useCallback(() => {
    if (activeTab === 'url') {
      handleUrlSubmit();
    } else {
      handleUploadSubmit();
    }
  }, [activeTab, handleUrlSubmit, handleUploadSubmit]);

  const handleFileChange: EuiFilePickerProps['onChange'] = useCallback((files: FileList | null) => {
    setFile(files && files.length > 0 ? files[0] : null);
  }, []);

  const isInstallDisabled = isLoading || (activeTab === 'url' ? !url.trim() : !file);

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="installPluginFlyoutTitle"
      size="s"
      hideCloseButton={false}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="installPluginFlyoutTitle">{labels.agentPlugins.installPluginFlyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <div
        css={css`
          padding-left: ${euiTheme.size.l};
          border-bottom: ${euiTheme.border.thin};
        `}
      >
        <EuiTabs bottomBorder={false}>
          <EuiTab
            isSelected={activeTab === 'url'}
            onClick={() => setActiveTab('url')}
            disabled={isLoading}
          >
            {labels.agentPlugins.installPluginUrlTab}
          </EuiTab>
          <EuiTab
            isSelected={activeTab === 'upload'}
            onClick={() => setActiveTab('upload')}
            disabled={isLoading}
          >
            {labels.agentPlugins.installPluginUploadTab}
          </EuiTab>
        </EuiTabs>
      </div>

      <EuiFlyoutBody>
        {activeTab === 'url' ? (
          <EuiForm
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleUrlSubmit();
            }}
          >
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
        ) : (
          <EuiForm
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleUploadSubmit();
            }}
          >
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
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} disabled={isLoading}>
              {labels.plugins.cancelButton}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleInstall}
              isLoading={isLoading}
              disabled={isInstallDisabled}
              data-test-subj="agentBuilderInstallPluginSubmitButton"
            >
              {labels.plugins.installButton}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
