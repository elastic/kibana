/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiSwitch,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';

import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';
import { useCasesFeatures } from '../../../common/use_cases_features';
import { TemplateConnectorForm } from './template_connector_form';
import * as commonI18n from '../../../common/translations';
import * as i18n from '../translations';

export interface TemplateSettingsFormProps {
  settings?: TemplateSettings;
  connector?: CaseConnectorWithoutName;
  onSettingsChange: (settings: TemplateSettings) => void;
  onConnectorChange: (connector: CaseConnectorWithoutName) => void;
  /**
   * Bumped by the parent on Reset. Used as part of the connector form's `key` so it remounts and
   * re-seeds from the reverted connector (its inner form only reads `defaultValue` at mount).
   */
  formResetKey?: number;
  compact?: boolean;
}

export const TemplateSettingsForm: React.FC<TemplateSettingsFormProps> = ({
  settings,
  connector,
  onSettingsChange,
  onConnectorChange,
  formResetKey = 0,
  compact = false,
}) => {
  // Alert syncing is not a feature in every solution (e.g. Observability disables it), so the toggle
  // is hidden there — mirroring the create-case form and case settings popover.
  const { isSyncAlertsEnabled } = useCasesFeatures();

  const setSetting = useCallback(
    (key: keyof TemplateSettings, value: boolean) => {
      // Keep both settings keys explicit in the panel state so an "off" toggle is a real `false`
      // (and is written as such into the definition merged on save) rather than a dropped key.
      onSettingsChange({
        syncAlerts: settings?.syncAlerts ?? false,
        extractObservables: settings?.extractObservables ?? false,
        [key]: value,
      });
    },
    [settings, onSettingsChange]
  );

  return (
    <EuiForm component="div" data-test-subj="templateSettingsForm">
      {!compact && (
        <>
          <EuiText size="s" color="subdued">
            {i18n.SETTINGS_SECTION_DESCRIPTION}
          </EuiText>
          <EuiSpacer size="m" />

          <EuiTitle size="xxs">
            <h4>{i18n.SETTINGS_SECTION_TITLE}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
        </>
      )}

      {isSyncAlertsEnabled && (
        <>
          <EuiFormRow fullWidth helpText={commonI18n.SYNC_ALERTS_HELP}>
            <EuiSwitch
              label={commonI18n.SYNC_ALERTS}
              checked={settings?.syncAlerts ?? false}
              onChange={(e) => setSetting('syncAlerts', e.target.checked)}
              data-test-subj="templateSettingsSyncAlertsSwitch"
            />
          </EuiFormRow>

          <EuiSpacer size="m" />
        </>
      )}

      <EuiFormRow fullWidth helpText={commonI18n.EXTRACT_OBSERVABLES_HELP}>
        <EuiSwitch
          label={commonI18n.EXTRACT_OBSERVABLES_LABEL}
          checked={settings?.extractObservables ?? false}
          onChange={(e) => setSetting('extractObservables', e.target.checked)}
          data-test-subj="templateSettingsExtractObservablesSwitch"
        />
      </EuiFormRow>

      <EuiHorizontalRule margin="l" />

      <EuiTitle size="xxs">
        <h4>{i18n.CONNECTOR_SECTION_TITLE}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />

      <TemplateConnectorForm
        key={`template-connector-form-${formResetKey}`}
        connector={connector}
        onChange={onConnectorChange}
      />
    </EuiForm>
  );
};

TemplateSettingsForm.displayName = 'TemplateSettingsForm';
