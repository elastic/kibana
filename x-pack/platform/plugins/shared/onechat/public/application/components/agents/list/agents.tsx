/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiButton } from '@elastic/eui';
import { AgentsList } from './agents_list';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';

export const OnechatAgents = () => {
  const { createOnechatUrl } = useNavigation();
  const headerButtons = [
    <EuiButton
      iconType={'plusInCircle'}
      color="primary"
      fill
      iconSide="left"
      href={createOnechatUrl(appPaths.agents.new)}
    >
      {i18n.translate('xpack.onechat.agents.newAgentButton', {
        defaultMessage: 'New Agent',
      })}
    </EuiButton>,
  ];
  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('xpack.onechat.agents.title', {
          defaultMessage: 'Agents',
        })}
        description={i18n.translate('xpack.onechat.agents.description', {
          defaultMessage: 'Manage and view your AI agents.',
        })}
        rightSideItems={headerButtons}
      />
      <KibanaPageTemplate.Section>
        <AgentsList />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
