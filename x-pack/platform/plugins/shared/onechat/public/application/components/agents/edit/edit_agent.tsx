/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { AgentForm } from './agent_form';
import { labels } from '../../../utils/i18n';

interface EditAgentProps {
  agentId: string;
}

export const EditAgent: React.FC<EditAgentProps> = ({ agentId }) => {
  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle={labels.agents.editAgent}
        description={i18n.translate('xpack.onechat.editAgent.description', {
          defaultMessage: 'Customize your AI agent, select tools and provide custom instructions.',
        })}
      />
      <KibanaPageTemplate.Section>
        <AgentForm agentId={agentId} />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
