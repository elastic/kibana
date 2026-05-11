/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiText } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { useConnectorsActions } from '../../context/connectors_provider';
import {
  AGENT_BUILDER_UI_EBT_ELEMENT,
  AGENT_BUILDER_UI_EBT_ENTITY_TYPE,
  AGENT_BUILDER_UI_EBT_LAYER2_CRUD_ACTION,
} from '../../agent_builder_ui_ebt';
import { labels } from '../../utils/i18n';
import { AgentBuilderConnectorsTable } from './table/connectors_table';
import { useHasConnectorsAllPrivileges } from '../../hooks/use_has_connectors_all_privileges';

export const AgentBuilderConnectors = () => {
  const { openCreateFlyout } = useConnectorsActions();
  const hasAllPrivileges = useHasConnectorsAllPrivileges();

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
                <EuiButton
                  key="create"
                  fill
                  iconType="plusInCircle"
                  onClick={openCreateFlyout}
                  data-ebt-element={AGENT_BUILDER_UI_EBT_ELEMENT.MANAGE_GLOBAL}
                  data-ebt-action={AGENT_BUILDER_UI_EBT_LAYER2_CRUD_ACTION.ENTITY_CREATE_NEW}
                  data-ebt-detail={AGENT_BUILDER_UI_EBT_ENTITY_TYPE.CONNECTOR}
                >
                  <EuiText size="s">{labels.connectors.createButton}</EuiText>
                </EuiButton>,
              ]
            : []),
        ]}
      />
      <KibanaPageTemplate.Section>
        <AgentBuilderConnectorsTable />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
