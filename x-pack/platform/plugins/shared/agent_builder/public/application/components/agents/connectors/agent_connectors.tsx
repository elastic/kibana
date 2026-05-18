/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useMemo } from 'react';
import { useListDetailPageStyles } from '../common/styles';
import { useListConnectors } from '../../../hooks/tools/use_mcp_connectors';
import { useConnectorsActions } from '../../../context/connectors_provider';
import { useAgentContext } from '../../../context/agent_provider';
import { labels } from '../../../utils/i18n';
import { AgentBuilderConnectorsTable } from '../../connectors/table/connectors_table';
import { useHasConnectorsAllPrivileges } from '../../../hooks/use_has_connectors_all_privileges';

export const AgentConnectors = () => {
  const styles = useListDetailPageStyles();
  const { agent, agentLoading, agentError } = useAgentContext();
  const { openCreateFlyout } = useConnectorsActions();
  const hasAllPrivileges = useHasConnectorsAllPrivileges();
  const {
    connectors,
    isLoading: isConnectorsLoading,
    error: connectorsError,
  } = useListConnectors({});

  const agentConnectors = useMemo(() => {
    const connectorIds = agent?.configuration?.connector_ids;
    if (connectorIds === undefined) return connectors;
    return connectors.filter((c) => connectorIds.includes(c.id));
  }, [connectors, agent?.configuration?.connector_ids]);

  if (agentLoading) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" css={styles.loadingSpinner}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexGroup>
    );
  }

  if (agentError || !agent) {
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
                <EuiButton key="create" fill iconType="plusInCircle" onClick={openCreateFlyout}>
                  <EuiText size="s">{labels.connectors.createButton}</EuiText>
                </EuiButton>,
              ]
            : []),
        ]}
      />
      <KibanaPageTemplate.Section>
        <AgentBuilderConnectorsTable
          connectors={agentConnectors}
          isLoading={isConnectorsLoading}
          error={connectorsError}
        />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
