/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
} from '@elastic/eui';
import { connectorsTechPreviewBadgeProps, labels } from '../../../utils/i18n';
import { appPaths } from '../../../utils/app_paths';
import { useNavigation } from '../../../hooks/use_navigation';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { CustomizeLandingEmptyState } from '../common/customize_landing_empty_state';
import connectorsIllustration from '../overview/assets/handshake.svg';

export interface ConnectorsCustomizeEmptyStateProps {
  canEditAgent: boolean;
  hasAllPrivileges: boolean;
  onAddFromLibrary: () => void;
  onCreateNew: () => void;
}

export const ConnectorsCustomizeEmptyState: React.FC<ConnectorsCustomizeEmptyStateProps> = ({
  canEditAgent,
  hasAllPrivileges,
  onAddFromLibrary,
  onCreateNew,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { createAgentBuilderUrl } = useNavigation();
  const { docLinksService } = useAgentBuilderServices();

  return (
    <CustomizeLandingEmptyState
      dataTestSubj="agentConnectorsCustomizeEmptyState"
      illustrationSrc={connectorsIllustration}
      title={labels.agentConnectors.emptyStateTitle}
      titleBadge={<EuiBetaBadge {...connectorsTechPreviewBadgeProps} />}
      description={labels.agentConnectors.emptyStateDescription}
      learnMoreHref={docLinksService.agentBuilderConnectors}
      learnMoreSuffix={labels.agentConnectors.emptyStateLearnMoreSuffix}
      primaryAction={
        hasAllPrivileges && canEditAgent ? (
          <EuiPopover
            aria-label={labels.connectors.addConnectorPopoverLabel}
            button={
              <EuiButton
                data-test-subj="agentConnectorsCustomizeEmptyStateAddButton"
                fill
                iconType="plusCircle"
                iconSide="left"
                onClick={() => setIsMenuOpen((prev) => !prev)}
              >
                {labels.agentConnectors.emptyStateAddButton}
              </EuiButton>
            }
            isOpen={isMenuOpen}
            closePopover={() => setIsMenuOpen(false)}
            anchorPosition="downLeft"
            panelPaddingSize="none"
          >
            <EuiContextMenuPanel
              items={[
                <EuiContextMenuItem
                  key="from-library"
                  icon="download"
                  data-test-subj="agentConnectorsAddFromLibraryMenuItem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onAddFromLibrary();
                  }}
                >
                  {labels.connectors.fromLibraryMenuItem}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="create-new"
                  icon="plusCircle"
                  data-test-subj="agentConnectorsCreateNewMenuItem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onCreateNew();
                  }}
                >
                  {labels.connectors.createNewMenuItem}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
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
