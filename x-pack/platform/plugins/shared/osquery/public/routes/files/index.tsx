/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { EuiPageHeader, EuiPageSection, EuiSpacer, EuiText, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { HostPicker } from './host_picker';
import { FileSystemTree } from './file_system_tree';
import type { HostCapability } from './use_host_capability';

interface SelectedHost {
  agentId: string;
  capability: HostCapability;
}

const PAGE_TITLE = (
  <FormattedMessage id="xpack.osquery.fileSystem.page.title" defaultMessage="File System" />
);

const PAGE_DESCRIPTION = (
  <FormattedMessage
    id="xpack.osquery.fileSystem.page.description"
    defaultMessage="Browse the file system of a single host using Osquery live queries."
  />
);

const FilesPageComponent: React.FC = () => {
  const [selectedHost, setSelectedHost] = useState<SelectedHost | undefined>();

  const handleAgentSelected = useCallback((agentId: string, capability: HostCapability) => {
    setSelectedHost({ agentId, capability });
  }, []);

  const selectedHostValues = useMemo(
    () => (selectedHost ? { agentId: selectedHost.agentId } : undefined),
    [selectedHost]
  );

  return (
    <EuiPageSection>
      <EuiPageHeader pageTitle={PAGE_TITLE} description={PAGE_DESCRIPTION} />
      <EuiSpacer size="l" />

      <EuiPanel hasBorder paddingSize="l">
        <HostPicker onAgentSelected={handleAgentSelected} />
      </EuiPanel>

      {selectedHost && selectedHostValues && (
        <>
          <EuiSpacer size="l" />
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.osquery.fileSystem.page.selectedHost"
              defaultMessage="Viewing file system for host: {agentId}"
              values={selectedHostValues}
            />
          </EuiText>
          <EuiSpacer size="s" />
          <FileSystemTree agentId={selectedHost.agentId} capability={selectedHost.capability} />
        </>
      )}
    </EuiPageSection>
  );
};

export const FilesPage = React.memo(FilesPageComponent);
