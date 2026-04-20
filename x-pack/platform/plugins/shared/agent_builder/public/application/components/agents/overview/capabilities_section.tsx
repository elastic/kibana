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
import toolsImage from './assets/wrench_gear.svg';
const { agentOverview: overviewLabels } = labels;

export interface CapabilitiesSectionProps {
  skillsCount: number;
  pluginsCount: number;
  toolsCount: number;
  skillsCountLoading: boolean;
  pluginsCountLoading: boolean;
  toolsCountLoading: boolean;
  enableElasticCapabilities: boolean;
  isExperimentalFeaturesEnabled: boolean;
  skillsHref: string;
  pluginsHref: string;
  toolsHref: string;
  onNavigateToSkills: () => void;
  onNavigateToPlugins: () => void;
  onNavigateToTools: () => void;
}

export const CapabilitiesSection: React.FC<CapabilitiesSectionProps> = ({
  skillsCount,
  pluginsCount,
  toolsCount,
  skillsCountLoading,
  pluginsCountLoading,
  toolsCountLoading,
  isExperimentalFeaturesEnabled,
  skillsHref,
  pluginsHref,
  toolsHref,
  onNavigateToSkills,
  onNavigateToPlugins,
  onNavigateToTools,
}) => (
  <>
    <EuiTitle size="s">
      <h2>{overviewLabels.capabilitiesTitle}</h2>
    </EuiTitle>
    <EuiSpacer size="l" />
    <EuiFlexGroup gutterSize="m" alignItems="stretch" wrap>
      <EuiFlexItem grow={1} style={{ minWidth: 240 }}>
        <CapabilityCard
          dataTestSubj="agentOverviewCapabilityCardSkills"
          count={skillsCount}
          title={overviewLabels.skillsLabel(skillsCountLoading ? 0 : skillsCount)}
          description={overviewLabels.skillsDescription}
          emptyDescription={overviewLabels.skillsOnboardingDescription}
          image={skillsImage}
          href={skillsCountLoading ? undefined : skillsHref}
          onClick={skillsCountLoading ? undefined : onNavigateToSkills}
          isCountLoading={skillsCountLoading}
        />
      </EuiFlexItem>
      {isExperimentalFeaturesEnabled && (
        <EuiFlexItem grow={1} style={{ minWidth: 240 }}>
          <CapabilityCard
            dataTestSubj="agentOverviewCapabilityCardPlugins"
            count={pluginsCount}
            title={overviewLabels.pluginsLabel(pluginsCountLoading ? 0 : pluginsCount)}
            description={overviewLabels.pluginsDescription}
            emptyDescription={overviewLabels.pluginsOnboardingDescription}
            image={pluginsImage}
            href={pluginsCountLoading ? undefined : pluginsHref}
            onClick={pluginsCountLoading ? undefined : onNavigateToPlugins}
            isCountLoading={pluginsCountLoading}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={1} style={{ minWidth: 240 }}>
        <CapabilityCard
          dataTestSubj="agentOverviewCapabilityCardTools"
          count={toolsCount}
          title={overviewLabels.toolsCapabilityLabel(toolsCountLoading ? 0 : toolsCount)}
          description={overviewLabels.toolsDescription}
          emptyDescription={overviewLabels.toolsOnboardingDescription}
          image={toolsImage}
          href={toolsCountLoading ? undefined : toolsHref}
          onClick={toolsCountLoading ? undefined : onNavigateToTools}
          isCountLoading={toolsCountLoading}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);
