/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIllustration,
  EuiLink,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { esqlRulesIllustration } from '../../assets/esql_rules_illustration';

export interface EsqlRulesEmptyStateProps {
  onCreateRule: () => void;
  onCreateWithAgent: () => void;
  createWithAgentDisabled?: boolean;
  createWithAgentTooltipText?: string;
  documentationHref: string;
}

/**
 * Empty state for the ES|QL rules list (write-capable users).
 */
export const EsqlRulesEmptyState = ({
  onCreateRule,
  onCreateWithAgent,
  createWithAgentDisabled,
  createWithAgentTooltipText,
  documentationHref,
}: EsqlRulesEmptyStateProps) => {
  const isAgentDisabled = createWithAgentDisabled === true;
  const createWithAgentButton = (
    <EuiButtonEmpty
      iconType="sparkles"
      onClick={onCreateWithAgent}
      disabled={isAgentDisabled}
      data-test-subj="esqlRulesEmptyStateCreateWithAgentButton"
    >
      <FormattedMessage
        id="xpack.alertingV2.rulesList.emptyState.createWithAgentButton"
        defaultMessage="Create with AI agent"
      />
    </EuiButtonEmpty>
  );

  return (
    <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '60vh' }}>
      <EuiFlexItem grow={false}>
        <EuiEmptyPrompt
          data-test-subj="esqlRulesEmptyState"
          layout="horizontal"
          color="plain"
          icon={
            <EuiIllustration
              type={esqlRulesIllustration}
              alt=""
              style={{ maxInlineSize: 240, marginInline: 'auto' }}
            />
          }
          title={
            <h2 style={{ whiteSpace: 'nowrap' }}>
              <FormattedMessage
                id="xpack.alertingV2.rulesList.emptyState.title"
                defaultMessage="Get started with ES|QL rules"
              />
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.alertingV2.rulesList.emptyState.description"
                defaultMessage="Build rules with native ES|QL queries. ES|QL rules are the newer alternative to Standard rules, with a dedicated rules list, a shared alerts inbox, and centralized action policies for notifications."
              />
            </p>
          }
          actions={
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  fill
                  iconType="plusCircle"
                  onClick={onCreateRule}
                  data-test-subj="esqlRulesEmptyStateCreateButton"
                >
                  <FormattedMessage
                    id="xpack.alertingV2.rulesList.emptyState.createButton"
                    defaultMessage="Create rule"
                  />
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {createWithAgentTooltipText ? (
                  <EuiToolTip content={createWithAgentTooltipText}>
                    <span>{createWithAgentButton}</span>
                  </EuiToolTip>
                ) : (
                  createWithAgentButton
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          footer={
            <>
              <EuiTitle size="xxs">
                <span>
                  <FormattedMessage
                    id="xpack.alertingV2.rulesList.emptyState.footerTitle"
                    defaultMessage="Need help?"
                  />
                </span>
              </EuiTitle>{' '}
              <EuiLink href={documentationHref} target="_blank" external>
                <FormattedMessage
                  id="xpack.alertingV2.rulesList.emptyState.footerLink"
                  defaultMessage="Read documentation"
                />
              </EuiLink>
            </>
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
