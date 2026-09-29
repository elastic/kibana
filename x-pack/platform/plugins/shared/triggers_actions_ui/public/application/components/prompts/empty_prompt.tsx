/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIllustration,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';
import { checklistDoc } from '@elastic/eui-illustrations';

export const EmptyPrompt = ({
  onCreateRulesClick,
  showCreateRule = true,
  documentationHref,
}: {
  onCreateRulesClick: () => void;
  showCreateRule: boolean;
  documentationHref?: string;
}) => {
  return (
    <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '60vh' }}>
      <EuiFlexItem grow={false}>
        <EuiEmptyPrompt
          data-test-subj="createFirstRuleEmptyPrompt"
          layout="horizontal"
          color="plain"
          icon={
            <EuiIllustration
              type={checklistDoc}
              alt=""
              style={{ maxInlineSize: 240, marginInline: 'auto' }}
            />
          }
          title={
            <h2 style={{ whiteSpace: 'nowrap' }}>
              <FormattedMessage
                id="xpack.triggersActionsUI.components.emptyPrompt.emptyTitle"
                defaultMessage="Get started with Standard rules"
              />
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.triggersActionsUI.components.emptyPrompt.emptyDesc"
                defaultMessage="Create classic alerting rules that evaluate conditions on a schedule and send notifications when they are met. For the newer ES|QL-based experience, switch to the ES|QL rules tab."
              />
            </p>
          }
          actions={
            showCreateRule ? (
              <EuiButton
                iconType="plusCircle"
                data-test-subj="createFirstRuleButton"
                fill
                onClick={onCreateRulesClick}
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.components.emptyPrompt.emptyButton"
                  defaultMessage="Create rule"
                />
              </EuiButton>
            ) : undefined
          }
          footer={
            documentationHref ? (
              <>
                <EuiTitle size="xxs">
                  <span>
                    <FormattedMessage
                      id="xpack.triggersActionsUI.components.emptyPrompt.footerTitle"
                      defaultMessage="Need help?"
                    />
                  </span>
                </EuiTitle>{' '}
                <EuiLink href={documentationHref} target="_blank" external>
                  <FormattedMessage
                    id="xpack.triggersActionsUI.components.emptyPrompt.footerLink"
                    defaultMessage="Read documentation"
                  />
                </EuiLink>
              </>
            ) : undefined
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
