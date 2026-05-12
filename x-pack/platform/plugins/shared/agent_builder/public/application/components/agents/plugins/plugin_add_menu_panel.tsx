/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiContextMenuItem, EuiContextMenuPanel } from '@elastic/eui';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common/telemetry';
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
      <EuiContextMenuItem
        key="fromUrlOrZip"
        icon="link"
        onClick={onInstallFromUrlOrZip}
        data-ebt-element={AGENT_BUILDER_UI_EBT.element.CUSTOMIZE_PLUGINS}
        data-ebt-action={AGENT_BUILDER_UI_EBT.action.uiChrome.INSTALL_FROM_URL_OR_ZIP}
        data-ebt-detail={AGENT_BUILDER_UI_EBT.entity.PLUGIN}
      >
        {labels.agentPlugins.fromUrlOrZipMenuItem}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="fromLibrary"
        icon="importAction"
        onClick={onAddFromLibrary}
        data-ebt-element={AGENT_BUILDER_UI_EBT.element.CUSTOMIZE_PLUGINS}
        data-ebt-action={AGENT_BUILDER_UI_EBT.action.layer2Crud.ENTITY_ADD_FROM_LIBRARY}
        data-ebt-detail={AGENT_BUILDER_UI_EBT.entity.PLUGIN}
      >
        {labels.agentPlugins.fromLibraryMenuItem}
      </EuiContextMenuItem>,
    ]}
  />
);
