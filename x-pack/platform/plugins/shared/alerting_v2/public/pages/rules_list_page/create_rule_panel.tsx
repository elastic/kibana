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
  EuiText,
} from '@elastic/eui';
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
      css={{ maxWidth: '100%', width: '100%', textAlign: 'center', margin: '0 auto' }}
      title={<h2>Welcome to the new Alerting experience</h2>}
      body={
        <EuiText size="s" color="subdued" textAlign="center">
          Powerful ES|QL-driven rules and support for external alerts, it delivers consistent,
          high-quality alert data into a unified experience.
        </EuiText>
      }
      hasBorder={true}
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
          <EuiHorizontalRule margin="m" />
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
    />
  );
};
