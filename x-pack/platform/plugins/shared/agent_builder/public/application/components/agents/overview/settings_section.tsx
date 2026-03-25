/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { labels } from '../../../utils/i18n';

const { agentOverview: overviewLabels } = labels;

export interface SettingsSectionProps {
  enableElasticCapabilities: boolean;
  currentInstructions: string;
  canEditAgent: boolean;
  isLoading: boolean;
  onToggleAutoInclude: (checked: boolean) => void;
  onInstructionsChange: (value: string) => void;
  onSaveInstructions: () => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  enableElasticCapabilities,
  currentInstructions,
  canEditAgent,
  isLoading,
  onToggleAutoInclude,
  onInstructionsChange,
  onSaveInstructions,
}) => (
  <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
    <EuiFlexItem grow={1}>
      <EuiTitle size="s">
        <h2>{overviewLabels.settingsTitle}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        {overviewLabels.settingsDescription}
      </EuiText>
    </EuiFlexItem>

    <EuiFlexItem grow={2}>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow>
          <EuiTitle size="xs">
            <h3>{overviewLabels.autoIncludeTitle}</h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            {overviewLabels.autoIncludeDescription}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={overviewLabels.autoIncludeLabel}
            showLabel={false}
            checked={enableElasticCapabilities}
            onChange={(e) => onToggleAutoInclude(e.target.checked)}
            disabled={!canEditAgent || isLoading}
            data-test-subj="agentOverviewAutoIncludeSwitch"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xl" />

      <EuiTitle size="xs">
        <h3>{overviewLabels.instructionsTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        {overviewLabels.instructionsDescription}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiTextArea
        fullWidth
        rows={6}
        placeholder={overviewLabels.instructionsPlaceholder}
        value={currentInstructions}
        onChange={(e) => onInstructionsChange(e.target.value)}
        disabled={!canEditAgent}
        data-test-subj="agentOverviewInstructionsInput"
      />
      <EuiSpacer size="m" />
      {canEditAgent && (
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiButton
            size="s"
            iconType="save"
            onClick={onSaveInstructions}
            isLoading={isLoading}
            data-test-subj="agentOverviewSaveInstructionsButton"
          >
            {overviewLabels.saveInstructionsButton}
          </EuiButton>
        </EuiFlexGroup>
      )}
    </EuiFlexItem>
  </EuiFlexGroup>
);
