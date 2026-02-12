/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { FileBrowser } from './file_browser';

interface FileBrowserFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName?: string;
}

export const FileBrowserFlyout: React.FC<FileBrowserFlyoutProps> = ({
  isOpen,
  onClose,
  agentId,
  agentName,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <EuiFlyout onClose={onClose} size="l" paddingSize="l">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <EuiIcon type="folder" size="l" style={{ marginRight: '8px' }} />
            <FormattedMessage
              id="xpack.osquery.fileBrowserFlyout.title"
              defaultMessage="File System Browser"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.osquery.fileBrowserFlyout.subtitle"
            defaultMessage="Browsing files for agent: {agentName} ({agentId})"
            values={{
              agentName: agentName || 'Unknown',
              agentId,
            }}
          />
        </EuiText>
      </EuiFlyoutHeader>
      
      <EuiFlyoutBody>
        <FileBrowser
          isInsideFlyout={true}
          selectedAgentId={agentId}
          onClose={onClose}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
