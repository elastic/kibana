/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiContextMenuItem, EuiContextMenuPanel } from '@elastic/eui';
import {
  AGENT_BUILDER_UI_EBT_ELEMENT,
  AGENT_BUILDER_UI_EBT_ENTITY_TYPE,
  AGENT_BUILDER_UI_EBT_LAYER2_CRUD_ACTION,
  AGENT_BUILDER_UI_EBT_UI_CHROME_ACTION,
} from '../../../agent_builder_ui_ebt';
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
        data-ebt-element={AGENT_BUILDER_UI_EBT_ELEMENT.CUSTOMIZE_PLUGINS}
        data-ebt-action={AGENT_BUILDER_UI_EBT_UI_CHROME_ACTION.INSTALL_FROM_URL_OR_ZIP}
        data-ebt-detail={AGENT_BUILDER_UI_EBT_ENTITY_TYPE.PLUGIN}
      >
        {labels.agentPlugins.fromUrlOrZipMenuItem}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="fromLibrary"
        icon="importAction"
        onClick={onAddFromLibrary}
        data-ebt-element={AGENT_BUILDER_UI_EBT_ELEMENT.CUSTOMIZE_PLUGINS}
        data-ebt-action={AGENT_BUILDER_UI_EBT_LAYER2_CRUD_ACTION.ENTITY_ADD_FROM_LIBRARY}
        data-ebt-detail={AGENT_BUILDER_UI_EBT_ENTITY_TYPE.PLUGIN}
      >
        {labels.agentPlugins.fromLibraryMenuItem}
      </EuiContextMenuItem>,
    ]}
  />
);
