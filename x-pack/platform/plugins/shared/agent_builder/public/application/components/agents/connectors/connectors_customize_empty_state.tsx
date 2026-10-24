/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBetaBadge, EuiButtonEmpty } from '@elastic/eui';
import { connectorsTechPreviewBadgeProps, labels } from '../../../utils/i18n';
import { appPaths } from '../../../utils/app_paths';
import { useNavigation } from '../../../hooks/use_navigation';
import { useKibana } from '../../../hooks/use_kibana';
import { CustomizeLandingEmptyState } from '../common/customize_landing_empty_state';
import { AddConnectorMenu } from './add_connector_menu';
import connectorsIllustration from '../overview/assets/handshake.svg';

export interface ConnectorsCustomizeEmptyStateProps {
  canEditAgent: boolean;
  hasAllPrivileges: boolean;
  onAddFromLibrary: () => void;
  onCreateNew: () => void;
  layout?: 'page' | 'inline';
}

export const ConnectorsCustomizeEmptyState: React.FC<ConnectorsCustomizeEmptyStateProps> = ({
  canEditAgent,
  hasAllPrivileges,
  onAddFromLibrary,
  onCreateNew,
  layout,
}) => {
  const { createAgentBuilderUrl } = useNavigation();
  const { docLinks } = useKibana().services;

  return (
    <CustomizeLandingEmptyState
      dataTestSubj="agentConnectorsCustomizeEmptyState"
      layout={layout}
      illustrationSrc={connectorsIllustration}
      title={labels.agentConnectors.emptyStateTitle}
      titleBadge={<EuiBetaBadge {...connectorsTechPreviewBadgeProps} />}
      description={labels.agentConnectors.emptyStateDescription}
      learnMoreHref={docLinks.links.agentBuilder.agentBuilderConnectors}
      learnMoreSuffix={labels.agentConnectors.emptyStateLearnMoreSuffix}
      primaryAction={
        hasAllPrivileges && canEditAgent ? (
          <AddConnectorMenu
            onAddFromLibrary={onAddFromLibrary}
            onCreateNew={onCreateNew}
            buttonLabel={labels.agentConnectors.emptyStateAddButton}
            buttonTestSubj="agentConnectorsCustomizeEmptyStateAddButton"
          />
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
