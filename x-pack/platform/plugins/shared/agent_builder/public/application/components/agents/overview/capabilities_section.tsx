/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { labels } from '../../../utils/i18n';
import { CapabilityRow } from './capability_row';

const { agentOverview: overviewLabels } = labels;

export interface CapabilitiesSectionProps {
  skillsCount: number;
  pluginsCount: number;
  connectorsCount: number;
  enableElasticCapabilities: boolean;
  isExperimentalFeaturesEnabled: boolean;
  isConnectorsEnabled: boolean;
  hasConnectorsPrivileges: boolean;
  onNavigateToSkills: () => void;
  onNavigateToPlugins: () => void;
  onNavigateToConnectors: () => void;
}

export const CapabilitiesSection: React.FC<CapabilitiesSectionProps> = ({
  skillsCount,
  pluginsCount,
  connectorsCount,
  enableElasticCapabilities,
  isExperimentalFeaturesEnabled,
  isConnectorsEnabled,
  hasConnectorsPrivileges,
  onNavigateToSkills,
  onNavigateToPlugins,
  onNavigateToConnectors,
}) => (
  <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
    <EuiFlexItem grow={1}>
      <EuiTitle size="s">
        <h2>{overviewLabels.capabilitiesTitle}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        {overviewLabels.capabilitiesDescription}
      </EuiText>
    </EuiFlexItem>

    <EuiFlexItem grow={2}>
      <EuiFlexGroup direction="column" gutterSize="l">
        {isExperimentalFeaturesEnabled && (
          <CapabilityRow
            count={skillsCount}
            label={overviewLabels.skillsLabel(skillsCount)}
            description={overviewLabels.skillsDescription}
            actionLabel={
              enableElasticCapabilities ? overviewLabels.addSkill : overviewLabels.customizeSkills
            }
            onAction={onNavigateToSkills}
          />
        )}

        {isExperimentalFeaturesEnabled && (
          <CapabilityRow
            count={pluginsCount}
            label={overviewLabels.pluginsLabel(pluginsCount)}
            description={overviewLabels.pluginsDescription}
            actionLabel={
              enableElasticCapabilities ? overviewLabels.addPlugin : overviewLabels.customizePlugins
            }
            onAction={onNavigateToPlugins}
          />
        )}

        {isConnectorsEnabled && (
          <CapabilityRow
            count={connectorsCount}
            label={overviewLabels.connectorsLabel(connectorsCount)}
            description={overviewLabels.connectorsDescription}
            actionLabel={overviewLabels.addConnector}
            onAction={hasConnectorsPrivileges ? onNavigateToConnectors : undefined}
          />
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);
