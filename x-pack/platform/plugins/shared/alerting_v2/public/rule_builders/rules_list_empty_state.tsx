/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { ALERTING_RULES_GUIDE_DOC_URL, paths } from '../constants';
import { RuleBuilderGrid } from './rule_builder_grid';

/** EUI defaults `euiEmptyPrompt__content` to max-width 36em (~576px); widen to match layout spec. */
const RULES_EMPTY_PROMPT_MAX_WIDTH_PX = 850;

const rulesListEmptyPromptCss = css({
  width: '100%',
  maxWidth: RULES_EMPTY_PROMPT_MAX_WIDTH_PX,
  marginInline: 'auto',
  '& .euiEmptyPrompt__main': {
    width: '100%',
    maxWidth: RULES_EMPTY_PROMPT_MAX_WIDTH_PX,
  },
  '& .euiEmptyPrompt__content': {
    maxWidth: `${RULES_EMPTY_PROMPT_MAX_WIDTH_PX}px`,
    width: '100%',
  },
});

export const RulesListEmptyState = () => {
  const { basePath } = useService(CoreStart('http'));
  const application = useService(CoreStart('application'));
  const agentBuilder = useService(PluginStart('agentBuilder'), {
    optional: true,
  }) as AgentBuilderPluginStart | undefined;

  const esqlAdvancedHref = basePath.prepend(paths.ruleCreateFormEsqlAdvanced);
  const hubHref = basePath.prepend(paths.ruleCreate);
  const docUrl = ALERTING_RULES_GUIDE_DOC_URL;
  const canOpenAgentBuilder = application.capabilities.agentBuilder?.show === true;
  const showAskAiAgentButton = canOpenAgentBuilder && Boolean(agentBuilder);

  return (
    <div
      data-test-subj="rulesListEmptyState"
      css={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        minHeight: 'min(78vh, 920px)',
        paddingBlock: 24,
        paddingInline: 16,
        boxSizing: 'border-box',
      }}
    >
      <div css={{ maxWidth: RULES_EMPTY_PROMPT_MAX_WIDTH_PX, width: '100%' }}>
        <EuiEmptyPrompt
          css={rulesListEmptyPromptCss}
          color="plain"
          hasBorder
          title={
            <h2>
              <FormattedMessage
                id="xpack.alertingV2.rulesList.emptyStateTitle"
                defaultMessage="Welcome to the new Alerting experience"
              />
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.alertingV2.rulesList.emptyStateDescription"
                defaultMessage="With powerful ES|QL-driven rules and support for external alerts, it delivers consistent, high-quality alert data into a unified experience."
              />
            </p>
          }
          actions={
            <div css={{ width: '100%' }}>
              <EuiTitle size="xs">
                <h3>
                  <FormattedMessage
                    id="xpack.alertingV2.rulesList.emptyStateRuleBuilderSectionTitle"
                    defaultMessage="Create using a Rule builder"
                  />
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <RuleBuilderGrid variant="featured" />
              <EuiSpacer size="m" />
              <EuiText size="s" textAlign="center">
                <EuiLink href={hubHref} data-test-subj="rulesListEmptyStateViewAllBuildersLink">
                  <FormattedMessage
                    id="xpack.alertingV2.rulesList.emptyStateViewAllBuilders"
                    defaultMessage="View all rule builders"
                  />
                </EuiLink>
              </EuiText>
              <EuiSpacer size="l" />
              <EuiFlexGroup
                alignItems="center"
                responsive={false}
                gutterSize="s"
                data-test-subj="rulesListEmptyStateOrSeparator"
              >
                <EuiFlexItem grow css={{ minWidth: 0 }}>
                  <EuiHorizontalRule margin="none" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="xpack.alertingV2.rulesList.emptyStateOrSeparator"
                      defaultMessage="or"
                    />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow css={{ minWidth: 0 }}>
                  <EuiHorizontalRule margin="none" />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s" wrap>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    href={esqlAdvancedHref}
                    color="text"
                    data-test-subj="rulesListEmptyStateEsqlAdvancedButton"
                  >
                    <FormattedMessage
                      id="xpack.alertingV2.rulesList.emptyStateEsqlAdvancedLink"
                      defaultMessage="Create with ES|QL"
                    />
                  </EuiButton>
                </EuiFlexItem>
                {showAskAiAgentButton ? (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      color="text"
                      iconType="productAgent"
                      data-test-subj="rulesListEmptyStateAgentBuilderButton"
                      onClick={() => {
                        agentBuilder?.toggleChat();
                      }}
                    >
                      <FormattedMessage
                        id="xpack.alertingV2.rulesList.emptyStateAskAiAgentButton"
                        defaultMessage="Create with AI Agent"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </div>
          }
          footer={
            <EuiText size="s" textAlign="center">
              <FormattedMessage
                id="xpack.alertingV2.rulesList.emptyStateDocFooter"
                defaultMessage="Want to learn more? {docLink}"
                values={{
                  docLink: (
                    <EuiLink
                      href={docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      external
                      data-test-subj="rulesListEmptyStateDocumentationLink"
                    >
                      <FormattedMessage
                        id="xpack.alertingV2.rulesList.emptyStateDocLinkText"
                        defaultMessage="Read documentation"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </EuiText>
          }
        />
      </div>
    </div>
  );
};
