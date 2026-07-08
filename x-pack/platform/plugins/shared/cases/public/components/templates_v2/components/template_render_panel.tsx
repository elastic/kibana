/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiTabs, EuiTab, EuiSpacer } from '@elastic/eui';

import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';
import { TemplatePreview } from './template_preview';
import { TemplateSettingsForm } from './template_settings_form';
import * as i18n from '../translations';

type TabId = 'fields' | 'settings';

interface TemplateRenderPanelProps {
  settings?: TemplateSettings;
  connector?: CaseConnectorWithoutName;
  onSettingsChange: (settings: TemplateSettings) => void;
  onConnectorChange: (connector: CaseConnectorWithoutName) => void;
  onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
  formResetKey?: number;
}

/**
 * Right-hand render panel with two tabs: "Fields" previews the YAML-authored fields; "Settings"
 * edits the template's case settings and default connector, which are managed here (not in the YAML
 * buffer) and merged into the definition on save.
 */
export const TemplateRenderPanel: React.FC<TemplateRenderPanelProps> = ({
  settings,
  connector,
  onSettingsChange,
  onConnectorChange,
  onFieldDefaultChange,
  formResetKey,
}) => {
  const [selectedTab, setSelectedTab] = useState<TabId>('fields');

  return (
    <div>
      <EuiTabs data-test-subj="templateRenderPanelTabs">
        <EuiTab
          isSelected={selectedTab === 'fields'}
          onClick={() => setSelectedTab('fields')}
          data-test-subj="templateRenderPanelTab-fields"
        >
          {i18n.FIELDS_TAB_LABEL}
        </EuiTab>
        <EuiTab
          isSelected={selectedTab === 'settings'}
          onClick={() => setSelectedTab('settings')}
          data-test-subj="templateRenderPanelTab-settings"
        >
          {i18n.SETTINGS_TAB_LABEL}
        </EuiTab>
      </EuiTabs>

      <EuiSpacer size="m" />

      {selectedTab === 'fields' ? (
        <TemplatePreview onFieldDefaultChange={onFieldDefaultChange} />
      ) : (
        <TemplateSettingsForm
          settings={settings}
          connector={connector}
          onSettingsChange={onSettingsChange}
          onConnectorChange={onConnectorChange}
          formResetKey={formResetKey}
        />
      )}
    </div>
  );
};

TemplateRenderPanel.displayName = 'TemplateRenderPanel';
