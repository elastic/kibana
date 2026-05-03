/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiContextMenuItem, EuiContextMenuPanel } from '@elastic/eui';
import { labels } from '../../../utils/i18n';

export interface PluginAddMenuPanelProps {
  onInstallFromUrlOrZip: () => void;
  onAddFromLibrary: () => void;
}

export const PluginAddMenuPanel: React.FC<PluginAddMenuPanelProps> = ({
  onInstallFromUrlOrZip,
  onAddFromLibrary,
}) => (
  <EuiContextMenuPanel
    items={[
      <EuiContextMenuItem key="fromUrlOrZip" icon="link" onClick={onInstallFromUrlOrZip}>
        {labels.agentPlugins.fromUrlOrZipMenuItem}
      </EuiContextMenuItem>,
      <EuiContextMenuItem key="fromLibrary" icon="importAction" onClick={onAddFromLibrary}>
        {labels.agentPlugins.fromLibraryMenuItem}
      </EuiContextMenuItem>,
    ]}
  />
);
