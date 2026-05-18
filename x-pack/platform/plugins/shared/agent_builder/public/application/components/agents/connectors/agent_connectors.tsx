/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiPopover,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useMemo } from 'react';
import useToggle from 'react-use/lib/useToggle';
import { i18n } from '@kbn/i18n';
import { useListDetailPageStyles } from '../common/styles';
import { useListConnectors } from '../../../hooks/tools/use_mcp_connectors';
import { useConnectorsActions } from '../../../context/connectors_provider';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
import { labels } from '../../../utils/i18n';
import { AgentBuilderConnectorsTable } from '../../connectors/table/connectors_table';
import { useHasConnectorsAllPrivileges } from '../../../hooks/use_has_connectors_all_privileges';

interface AgentConnectorsProps {
  agentId: string;
}

export const AgentConnectors = ({ agentId }: AgentConnectorsProps) => {
  const styles = useListDetailPageStyles();
  const agentQuery = useAgentBuilderAgentById(agentId);
  const { openCreateFlyout } = useConnectorsActions();
  const [isAddMenuOpen, toggleAddMenu] = useToggle(false);
  const addConnectorPopoverId = useGeneratedHtmlId({ prefix: 'addConnectorPopover' });
  const hasAllPrivileges = useHasConnectorsAllPrivileges();
  const connectorsQuery = useListConnectors({});

  const agentConnectors = useMemo(() => {
    const connectorIds = agentQuery.agent?.configuration?.connector_ids;
    if (connectorIds === undefined) return connectorsQuery.connectors;
    return connectorsQuery.connectors.filter((c) => connectorIds.includes(c.id));
  }, [connectorsQuery.connectors, agentQuery.agent?.configuration?.connector_ids]);

  if (agentQuery.isLoading) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" css={styles.loadingSpinner}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexGroup>
    );
  }

  if (agentQuery.error || !agentQuery.agent) {
    return null;
  }

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderConnectorsPage">
      <KibanaPageTemplate.Header
        pageTitle={labels.connectors.libraryTitle}
        description={labels.connectors.pageDescription}
        css={({ euiTheme }) => ({
          backgroundColor: euiTheme.colors.backgroundBasePlain,
          borderBlockEnd: 'none',
        })}
        rightSideItems={[
          ...(hasAllPrivileges
            ? [
                <EuiPopover
                  key="add-connector"
                  button={
                    <EuiButton
                      fill
                      iconType="arrowDown"
                      iconSide="right"
                      onClick={toggleAddMenu}
                      data-test-subj="agentBuilderAddConnectorButton"
                    >
                      <EuiText size="s">
                        {i18n.translate('xpack.agentBuilder.agentConnectors.addConnectorButton', {
                          defaultMessage: 'Add connector',
                        })}
                      </EuiText>
                    </EuiButton>
                  }
                  aria-labelledby={addConnectorPopoverId}
                  isOpen={isAddMenuOpen}
                  closePopover={() => toggleAddMenu(false)}
                  anchorPosition="downRight"
                  panelPaddingSize="none"
                >
                  <EuiContextMenuPanel
                    items={[
                      <EuiContextMenuItem key="add-existing" icon="link">
                        {i18n.translate(
                          'xpack.agentBuilder.agentConnectors.addExistingConnectorMenuItem',
                          { defaultMessage: 'Add existing connector' }
                        )}
                      </EuiContextMenuItem>,
                      <EuiContextMenuItem
                        key="create-new"
                        icon="plusInCircle"
                        onClick={() => {
                          toggleAddMenu(false);
                          openCreateFlyout();
                        }}
                      >
                        {i18n.translate(
                          'xpack.agentBuilder.agentConnectors.createNewConnectorMenuItem',
                          { defaultMessage: 'Create new connector' }
                        )}
                      </EuiContextMenuItem>,
                    ]}
                  />
                </EuiPopover>,
              ]
            : []),
        ]}
      />
      <KibanaPageTemplate.Section>
        <AgentBuilderConnectorsTable
          connectors={agentConnectors}
          isLoading={connectorsQuery.isLoading}
          error={connectorsQuery.error}
        />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
