/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { labels } from '../../../utils/i18n';
import { CapabilityCard } from './capability_card';
import skillsImage from './assets/connected-power-plug.svg';
import pluginsImage from './assets/projects-folder.svg';
const { agentOverview: overviewLabels } = labels;

export interface CapabilitiesSectionProps {
  skillsCount: number;
  pluginsCount: number;
  enableElasticCapabilities: boolean;
  isExperimentalFeaturesEnabled: boolean;
  skillsHref: string;
  pluginsHref: string;
  onNavigateToSkills: () => void;
  onNavigateToPlugins: () => void;
}

export const CapabilitiesSection: React.FC<CapabilitiesSectionProps> = ({
  skillsCount,
  pluginsCount,
  isExperimentalFeaturesEnabled,
  skillsHref,
  pluginsHref,
  onNavigateToSkills,
  onNavigateToPlugins,
}) => (
  <>
    <EuiTitle size="s">
      <h2>{overviewLabels.capabilitiesTitle}</h2>
    </EuiTitle>
    <EuiSpacer size="l" />
    <EuiFlexGroup gutterSize="m" alignItems="stretch">
      <EuiFlexItem grow={1}>
        <CapabilityCard
          count={skillsCount}
          title={overviewLabels.skillsLabel(skillsCount)}
          description={overviewLabels.skillsDescription}
          emptyDescription={overviewLabels.skillsOnboardingDescription}
          image={skillsImage}
          href={skillsHref}
          onClick={onNavigateToSkills}
        />
      </EuiFlexItem>
      {isExperimentalFeaturesEnabled && (
        <EuiFlexItem grow={1}>
          <CapabilityCard
            count={pluginsCount}
            title={overviewLabels.pluginsLabel(pluginsCount)}
            description={overviewLabels.pluginsDescription}
            emptyDescription={overviewLabels.pluginsOnboardingDescription}
            image={pluginsImage}
            href={pluginsHref}
            onClick={onNavigateToPlugins}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  </>
);
