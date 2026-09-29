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
import { projectsGear } from '@elastic/eui-illustrations';
import { FormattedMessage } from '@kbn/i18n-react';

export interface ActionPoliciesEmptyStateProps {
  onCreatePolicy: () => void;
  onCreateWithAgent: () => void;
  createWithAgentDisabled?: boolean;
  createWithAgentTooltipText?: string;
  documentationHref: string;
}

/**
 * Empty state for the action policies list (write-capable users).
 */
export const ActionPoliciesEmptyState = ({
  onCreatePolicy,
  onCreateWithAgent,
  createWithAgentDisabled,
  createWithAgentTooltipText,
  documentationHref,
}: ActionPoliciesEmptyStateProps) => {
  const isAgentDisabled = createWithAgentDisabled === true;
  const createWithAgentButton = (
    <EuiButtonEmpty
      iconType="sparkles"
      onClick={onCreateWithAgent}
      disabled={isAgentDisabled}
      data-test-subj="actionPoliciesEmptyStateCreateWithAgentButton"
    >
      <FormattedMessage
        id="xpack.alertingV2.actionPoliciesList.emptyState.createWithAgentButton"
        defaultMessage="Create with AI agent"
      />
    </EuiButtonEmpty>
  );

  return (
    <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '60vh' }}>
      <EuiFlexItem grow={false}>
        <EuiEmptyPrompt
          data-test-subj="actionPoliciesEmptyState"
          layout="horizontal"
          color="plain"
          icon={
            <EuiIllustration
              type={projectsGear}
              alt=""
              style={{ maxInlineSize: 240, marginInline: 'auto' }}
            />
          }
          title={
            <h2 style={{ whiteSpace: 'nowrap' }}>
              <FormattedMessage
                id="xpack.alertingV2.actionPoliciesList.emptyState.title"
                defaultMessage="Get started with action policies"
              />
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.alertingV2.actionPoliciesList.emptyState.description"
                defaultMessage="Action policies let you manage notification channels in one place and reuse them across multiple ES|QL rules."
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
                  onClick={onCreatePolicy}
                  data-test-subj="actionPoliciesEmptyStateCreateButton"
                >
                  <FormattedMessage
                    id="xpack.alertingV2.actionPoliciesList.emptyState.createButton"
                    defaultMessage="Create action policy"
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
                    id="xpack.alertingV2.actionPoliciesList.emptyState.footerTitle"
                    defaultMessage="Need help?"
                  />
                </span>
              </EuiTitle>{' '}
              <EuiLink href={documentationHref} target="_blank" external>
                <FormattedMessage
                  id="xpack.alertingV2.actionPoliciesList.emptyState.footerLink"
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
