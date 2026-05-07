/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiCard,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CoreStart, useService } from '@kbn/core-di-browser';

export interface CreateRulePanelProps {
  onClose: () => void;
}

export const CreateRulePanel: React.FC<CreateRulePanelProps> = ({ onClose }) => {
  const application = useService(CoreStart('application'));

  const navigateToDiscoverEsql = useCallback(() => {
    application.navigateToApp('discover', {
      state: {
        defaultState: {
          query: { esql: 'FROM *' },
        },
      },
    });
  }, [application]);
  return (
    <EuiEmptyPrompt
      css={{
        maxWidth: '100%',
        width: '100%',
        textAlign: 'center',
        margin: '0 auto',
        '.euiEmptyPrompt__main': { maxWidth: '100%' },
        '.euiEmptyPrompt__actions': { maxWidth: '100%' },
        gap: '1rem',
      }}
      title={<h2>Welcome to the new Alerting experience</h2>}
      body={
        <EuiText size="s" color="subdued" textAlign="center">
          Powerful ES|QL-driven rules and support for external alerts, it delivers consistent,
          high-quality alert data into a unified experience.
        </EuiText>
      }
      hasBorder={true}
      paddingSize="l"
      actions={
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCard
                layout="horizontal"
                display="plain"
                titleElement="h3"
                titleSize="xs"
                hasBorder={true}
                title="Create in discover"
                description="Create as an ES|QL query with live preview. YAML editor available."
                onClick={navigateToDiscoverEsql}
                icon={<EuiIcon type="productDiscover" color="text" size="l" aria-hidden={true} />}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiCard
                betaBadgeProps={{ label: 'Coming soon', color: 'hollow' }}
                layout="horizontal"
                titleElement="h3"
                titleSize="xs"
                title="Create with AI Agent"
                description="Set up an Alerting rule with the help of the AI Agent."
                aria-disabled={true}
                display="subdued"
                icon={<EuiIcon type="productAgent" color="text" size="l" aria-hidden={true} />}
                css={{
                  cursor: 'default',
                  pointerEvents: 'none',
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" gutterSize="m" css={{ width: '100%' }}>
            <EuiFlexItem>
              <EuiHorizontalRule margin="none" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                or
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiHorizontalRule margin="none" />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiTitle size="xs">
            <h2>Start from a rule builder</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCard
                layout="horizontal"
                display="plain"
                titleElement="h3"
                titleSize="xs"
                hasBorder={true}
                title="Threshold Alert"
                description="Monitor one or more metrics and alert when they cross a threshold. Multi-condition support with custom aggregations."
                onClick={navigateToDiscoverEsql}
                icon={<EuiIcon type="chartThreshold" color="text" size="l" aria-hidden={true} />}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      }
      footer={
        <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="m">
          <EuiText size="s" color="subdued" textAlign="center">
            <p>Want to learn more?</p>
          </EuiText>
          <EuiLink
            href="https://www.elastic.co/guide/en/elasticsearch/reference/current/alerting-rule-types.html"
            target="_blank"
            external
            data-test-subj="createRulePanelDocumentationLink"
            aria-label="Read documentation"
          >
            <FormattedMessage
              id="xpack.alertingV2.rulesListPage.createRulePanel.documentationLinkText"
              defaultMessage="Read documentation"
            />
          </EuiLink>
        </EuiFlexGroup>
      }
    />
  );
};
