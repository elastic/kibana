/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { labels } from '../../../utils/i18n';
import { appPaths } from '../../../utils/app_paths';
import { useNavigation } from '../../../hooks/use_navigation';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { CustomizeLandingEmptyState } from '../common/customize_landing_empty_state';
import skillsIllustration from '../overview/assets/connected-power-plug.svg';

export interface SkillsCustomizeEmptyStateProps {
  canEditAgent: boolean;
  onOpenLibrary: () => void;
}

export const SkillsCustomizeEmptyState: React.FC<SkillsCustomizeEmptyStateProps> = ({
  canEditAgent,
  onOpenLibrary,
}) => {
  const { agentId } = useParams<{ agentId: string }>();
  const { createAgentBuilderUrl, navigateToAgentBuilderUrl } = useNavigation();
  const isExperimentalFeaturesEnabled = useExperimentalFeatures();
  const { docLinksService } = useAgentBuilderServices();

  const description = isExperimentalFeaturesEnabled ? (
    <FormattedMessage
      id="xpack.agentBuilder.agentSkills.customizeEmptyStateDescription"
      defaultMessage="Skills tell your agent how to approach specific tasks, like following a runbook or structuring a report. For bundled capabilities, use {plugins}. For callable functions and integrations, use {tools}."
      values={{
        plugins: (
          <EuiLink
            data-test-subj="agentSkillsCustomizeEmptyStateLinkPlugins"
            onClick={() => navigateToAgentBuilderUrl(appPaths.agent.plugins({ agentId: agentId! }))}
          >
            Plugins
          </EuiLink>
        ),
        tools: (
          <EuiLink
            data-test-subj="agentSkillsCustomizeEmptyStateLinkTools"
            onClick={() => navigateToAgentBuilderUrl(appPaths.agent.tools({ agentId: agentId! }))}
          >
            Tools
          </EuiLink>
        ),
      }}
    />
  ) : (
    <FormattedMessage
      id="xpack.agentBuilder.agentSkills.customizeEmptyStateDescriptionNoExperimental"
      defaultMessage="Skills tell your agent how to approach specific tasks, like following a runbook or structuring a report. Attach {tools} so your agent can call functions and integrations."
      values={{
        tools: (
          <EuiLink
            data-test-subj="agentSkillsCustomizeEmptyStateLinkTools"
            onClick={() => navigateToAgentBuilderUrl(appPaths.agent.tools({ agentId: agentId! }))}
          >
            Tools
          </EuiLink>
        ),
      }}
    />
  );

  const footer = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="info" color="subdued" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          {labels.agentSkills.emptyStateFooter}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <CustomizeLandingEmptyState
      dataTestSubj="agentSkillsCustomizeEmptyState"
      illustrationSrc={skillsIllustration}
      title={labels.agentSkills.emptyStateTitle}
      description={description}
      learnMoreHref={docLinksService.agentBuilderSkills}
      learnMoreLabel={labels.customizeLandingEmptyState.learnMore}
      learnMoreSuffix={labels.agentSkills.emptyStateLearnMoreSuffix}
      footer={footer}
      primaryAction={
        canEditAgent ? (
          <EuiButton
            data-test-subj="agentSkillsCustomizeEmptyStateAddButton"
            fill
            iconType="plus"
            iconSide="left"
            onClick={onOpenLibrary}
          >
            {labels.agentSkills.emptyStateAddButton}
          </EuiButton>
        ) : undefined
      }
      secondaryAction={
        <EuiButtonEmpty href={createAgentBuilderUrl(appPaths.manage.skills)}>
          {labels.agentSkills.manageAllSkills}
        </EuiButtonEmpty>
      }
    />
  );
};
