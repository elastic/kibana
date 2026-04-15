/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageHeader, EuiPageTemplate, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { paths } from '../../constants';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { RuleCreationEntryCards } from '../../rule_builders/rule_creation_entry_cards';
import { RuleBuilderGrid } from '../../rule_builders/rule_builder_grid';

export const RuleCreateHubPage = () => {
  useBreadcrumbs('create_hub');

  const { basePath } = useService(CoreStart('http'));
  const application = useService(CoreStart('application'));
  const agentBuilder = useService(PluginStart('agentBuilder'), {
    optional: true,
  }) as AgentBuilderPluginStart | undefined;

  const esqlAdvancedHref = basePath.prepend(paths.ruleCreateFormEsqlAdvanced);
  const canOpenAgentBuilder = application.capabilities.agentBuilder?.show === true;
  const showAskAiAgentButton = canOpenAgentBuilder && Boolean(agentBuilder);

  return (
    <EuiPageTemplate.Section paddingSize="none" restrictWidth={true}>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="xpack.alertingV2.ruleCreateHub.pageTitle"
            defaultMessage="New Alerting Experience"
          />
        }
        description={
          <EuiText size="m" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.alertingV2.ruleCreateHub.intro"
                defaultMessage="Powerful ES|QL-driven rules and support for external alerts — consistent, high-quality alert data in a unified experience. Start with ES|QL, AI, or a rule builder below."
              />
            </p>
          </EuiText>
        }
      />
      <EuiSpacer size="l" />
      <RuleCreationEntryCards
        esqlHref={esqlAdvancedHref}
        showAiCard={showAskAiAgentButton}
        onCreateWithAi={
          showAskAiAgentButton ? () => agentBuilder?.toggleChat() : undefined
        }
      />
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.alertingV2.ruleCreateHub.sectionTitle"
            defaultMessage="Start from a rule builder"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <RuleBuilderGrid variant="all" />
    </EuiPageTemplate.Section>
  );
};
