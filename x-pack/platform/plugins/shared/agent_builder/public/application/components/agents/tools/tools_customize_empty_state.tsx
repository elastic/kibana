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
import {
  AGENT_BUILDER_UI_EBT_ELEMENT,
  AGENT_BUILDER_UI_EBT_ENTITY_TYPE,
  AGENT_BUILDER_UI_EBT_LAYER2_CRUD_ACTION,
  AGENT_BUILDER_UI_EBT_MANAGE_GLOBAL_ACTION,
  AGENT_BUILDER_UI_EBT_UI_CHROME_ACTION,
} from '../../../agent_builder_ui_ebt';
import { labels } from '../../../utils/i18n';
import { appPaths } from '../../../utils/app_paths';
import { useNavigation } from '../../../hooks/use_navigation';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { CustomizeLandingEmptyState } from '../common/customize_landing_empty_state';
import toolsIllustration from '../overview/assets/wrench_gear.svg';

export interface ToolsCustomizeEmptyStateProps {
  canEditAgent: boolean;
  onOpenLibrary: () => void;
}

export const ToolsCustomizeEmptyState: React.FC<ToolsCustomizeEmptyStateProps> = ({
  canEditAgent,
  onOpenLibrary,
}) => {
  const { agentId } = useParams<{ agentId: string }>();
  const { createAgentBuilderUrl, navigateToAgentBuilderUrl } = useNavigation();
  const isExperimentalFeaturesEnabled = useExperimentalFeatures();
  const { docLinksService } = useAgentBuilderServices();

  const description = isExperimentalFeaturesEnabled ? (
    <FormattedMessage
      id="xpack.agentBuilder.agentTools.customizeEmptyStateDescription"
      defaultMessage="Tools are actions your agent can take, like searching data, running queries, or calling external APIs. For task-specific instructions, use {skills}. For bundled capabilities, use {plugins}."
      values={{
        skills: (
          <EuiLink
            data-test-subj="agentToolsCustomizeEmptyStateLinkSkills"
            href={createAgentBuilderUrl(appPaths.agent.skills({ agentId: agentId! }))}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              navigateToAgentBuilderUrl(appPaths.agent.skills({ agentId: agentId! }));
            }}
            data-ebt-element={AGENT_BUILDER_UI_EBT_ELEMENT.CUSTOMIZE_TOOLS}
            data-ebt-action={AGENT_BUILDER_UI_EBT_UI_CHROME_ACTION.CROSS_NAVIGATE}
            data-ebt-detail={AGENT_BUILDER_UI_EBT_ENTITY_TYPE.SKILL}
          >
            Skills
          </EuiLink>
        ),
        plugins: (
          <EuiLink
            data-test-subj="agentToolsCustomizeEmptyStateLinkPlugins"
            href={createAgentBuilderUrl(appPaths.agent.plugins({ agentId: agentId! }))}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              navigateToAgentBuilderUrl(appPaths.agent.plugins({ agentId: agentId! }));
            }}
            data-ebt-element={AGENT_BUILDER_UI_EBT_ELEMENT.CUSTOMIZE_TOOLS}
            data-ebt-action={AGENT_BUILDER_UI_EBT_UI_CHROME_ACTION.CROSS_NAVIGATE}
            data-ebt-detail={AGENT_BUILDER_UI_EBT_ENTITY_TYPE.PLUGIN}
          >
            Plugins
          </EuiLink>
        ),
      }}
    />
  ) : (
    <FormattedMessage
      id="xpack.agentBuilder.agentTools.customizeEmptyStateDescriptionNoExperimental"
      defaultMessage="Tools are actions your agent can take, like searching data, running queries, or calling external APIs. For task-specific instructions, use {skills}."
      values={{
        skills: (
          <EuiLink
            data-test-subj="agentToolsCustomizeEmptyStateLinkSkills"
            href={createAgentBuilderUrl(appPaths.agent.skills({ agentId: agentId! }))}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              navigateToAgentBuilderUrl(appPaths.agent.skills({ agentId: agentId! }));
            }}
            data-ebt-element={AGENT_BUILDER_UI_EBT_ELEMENT.CUSTOMIZE_TOOLS}
            data-ebt-action={AGENT_BUILDER_UI_EBT_UI_CHROME_ACTION.CROSS_NAVIGATE}
            data-ebt-detail={AGENT_BUILDER_UI_EBT_ENTITY_TYPE.SKILL}
          >
            Skills
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
          {labels.agentTools.emptyStateFooter}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <CustomizeLandingEmptyState
      dataTestSubj="agentToolsCustomizeEmptyState"
      illustrationSrc={toolsIllustration}
      title={labels.agentTools.emptyStateTitle}
      description={description}
      learnMoreHref={docLinksService.agentBuilderTools}
      learnMoreLabel={labels.customizeLandingEmptyState.learnMore}
      learnMoreSuffix={labels.agentTools.emptyStateLearnMoreSuffix}
      footer={footer}
      primaryAction={
        canEditAgent ? (
          <EuiButton
            data-test-subj="agentToolsCustomizeEmptyStateAddButton"
            fill
            iconType="plus"
            iconSide="left"
            onClick={onOpenLibrary}
            data-ebt-element={AGENT_BUILDER_UI_EBT_ELEMENT.CUSTOMIZE_TOOLS}
            data-ebt-action={AGENT_BUILDER_UI_EBT_LAYER2_CRUD_ACTION.ENTITY_ADD_FROM_LIBRARY}
            data-ebt-detail={AGENT_BUILDER_UI_EBT_ENTITY_TYPE.TOOL}
          >
            {labels.agentTools.emptyStateAddButton}
          </EuiButton>
        ) : undefined
      }
      secondaryAction={
        <EuiButtonEmpty
          href={createAgentBuilderUrl(appPaths.manage.tools)}
          data-ebt-element={AGENT_BUILDER_UI_EBT_ELEMENT.CUSTOMIZE_TOOLS}
          data-ebt-action={AGENT_BUILDER_UI_EBT_MANAGE_GLOBAL_ACTION.MANAGE_ENTITY_LIST_VIEW}
        >
          {labels.agentTools.manageAllTools}
        </EuiButtonEmpty>
      }
    />
  );
};
