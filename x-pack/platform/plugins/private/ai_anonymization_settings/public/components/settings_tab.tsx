/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFormRow,
  EuiPanel,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AnonymizationFailureMode } from '@kbn/ai-anonymization-common';

interface SettingsTabProps {
  maskingEnabled: boolean;
  onFailure: AnonymizationFailureMode;
  onMaskingEnabledChange: (enabled: boolean) => void;
  onOnFailureChange: (mode: AnonymizationFailureMode) => void;
  isSavingEnabled: boolean;
}

const onFailureOptions = [
  {
    id: 'block' as const,
    label: i18n.translate('xpack.aiAnonymizationSettings.settingsTab.onFailure.block', {
      defaultMessage: 'Block the request',
    }),
  },
  {
    id: 'allow_unsafe' as const,
    label: i18n.translate('xpack.aiAnonymizationSettings.settingsTab.onFailure.allowUnsafe', {
      defaultMessage: 'Allow the request through without the patterns that cannot run',
    }),
  },
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  maskingEnabled,
  onFailure,
  onMaskingEnabledChange,
  onOnFailureChange,
  isSavingEnabled,
}) => {
  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.aiAnonymizationSettings.settingsTab.maskingTitle"
            defaultMessage="Mask PII in AI requests"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFormRow>
        <EuiSwitch
          label={i18n.translate('xpack.aiAnonymizationSettings.settingsTab.maskingSwitchLabel', {
            defaultMessage: 'Mask PII in AI requests',
          })}
          showLabel={false}
          checked={maskingEnabled}
          disabled={!isSavingEnabled}
          onChange={(e) => onMaskingEnabledChange(e.target.checked)}
          data-test-subj="aiAnonymizationSettingsMaskingEnabledSwitch"
        />
      </EuiFormRow>
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.aiAnonymizationSettings.settingsTab.maskingHelpText"
          defaultMessage="Applies to AI features in this space that use Kibana's shared AI integration, with any connector. Features that call a connector directly are not masked."
        />
      </EuiText>

      <EuiSpacer size="l" />

      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.aiAnonymizationSettings.settingsTab.onFailureTitle"
            defaultMessage="If masking cannot run"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.aiAnonymizationSettings.settingsTab.onFailureHelpText"
          defaultMessage="Default: Block the request. Choose how AI requests are handled if a pattern cannot run, for example because it does not compile or times out. When allowed through, a pattern that does not compile is skipped and the other patterns still apply; if the patterns fail while running, none of them is applied and the request is sent unmasked."
        />
      </EuiText>
      <EuiSpacer size="s" />
      <EuiRadioGroup
        name="aiAnonymizationSettingsOnFailure"
        options={onFailureOptions}
        idSelected={onFailure}
        disabled={!isSavingEnabled}
        onChange={(id) => onOnFailureChange(id as AnonymizationFailureMode)}
        data-test-subj="aiAnonymizationSettingsOnFailureRadioGroup"
      />
    </EuiPanel>
  );
};
