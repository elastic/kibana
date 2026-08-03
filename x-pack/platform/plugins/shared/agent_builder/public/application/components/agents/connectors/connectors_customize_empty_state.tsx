/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { labels } from '../../../utils/i18n';
import { appPaths } from '../../../utils/app_paths';
import { useNavigation } from '../../../hooks/use_navigation';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { CustomizeLandingEmptyState } from '../common/customize_landing_empty_state';
import connectorsIllustration from '../overview/assets/handshake.svg';

export interface ConnectorsCustomizeEmptyStateProps {
  canEditAgent: boolean;
  onAddFromLibrary: () => void;
}

export const ConnectorsCustomizeEmptyState: React.FC<ConnectorsCustomizeEmptyStateProps> = ({
  canEditAgent,
  onAddFromLibrary,
}) => {
  const { createAgentBuilderUrl } = useNavigation();
  const { docLinksService } = useAgentBuilderServices();

  return (
    <CustomizeLandingEmptyState
      dataTestSubj="agentConnectorsCustomizeEmptyState"
      illustrationSrc={connectorsIllustration}
      title={labels.agentConnectors.emptyStateTitle}
      description={labels.agentConnectors.emptyStateDescription}
      learnMoreHref={docLinksService.agentBuilderConnectors}
      learnMoreSuffix={labels.agentConnectors.emptyStateLearnMoreSuffix}
      primaryAction={
        canEditAgent ? (
          <EuiButton
            data-test-subj="agentConnectorsCustomizeEmptyStateAddButton"
            fill
            iconType="plusInCircle"
            iconSide="left"
            onClick={onAddFromLibrary}
          >
            {labels.agentConnectors.emptyStateAddButton}
          </EuiButton>
        ) : undefined
      }
      secondaryAction={
        <EuiButtonEmpty href={createAgentBuilderUrl(appPaths.manage.connectors)}>
          {labels.agentConnectors.emptyStateManageAll}
        </EuiButtonEmpty>
      }
    />
  );
};
