/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface RuleCreateOptionsPanelProps {
  onCreateEsqlRule: () => void;
  layout?: 'vertical' | 'horizontal';
  onCreateWithAgent: () => void;
  onCreateThresholdAlert?: () => void;
}

export const RuleCreateOptionsPanel: React.FC<RuleCreateOptionsPanelProps> = ({
  onCreateEsqlRule,
  layout = 'horizontal',
  onCreateWithAgent,
  onCreateThresholdAlert,
}) => {
  const { euiTheme } = useEuiTheme();
  const isVerticalLayout = layout === 'vertical';

  return (
    <EuiSplitPanel.Outer
      hasBorder={!isVerticalLayout}
      hasShadow={false}
      grow={false}
      css={{
        maxWidth: isVerticalLayout ? 'none' : euiTheme.breakpoint.l,
        margin: isVerticalLayout ? 0 : '0 auto',
        textAlign: isVerticalLayout ? 'left' : 'center',
      }}
    >
      <EuiSplitPanel.Inner css={{ padding: isVerticalLayout ? 0 : euiTheme.size.xxxl }}>
        {!isVerticalLayout ? (
          <>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  id="xpack.alertingV2.ruleCreateOptionsPanel.welcomeTitle"
                  defaultMessage="Welcome to the new Alerting experience"
                />
              </h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued" textAlign="center">
              <FormattedMessage
                id="xpack.alertingV2.ruleCreateOptionsPanel.welcomeDescription"
                defaultMessage="Powerful ES|QL-driven rules and support for external alerts, it delivers consistent, high-quality alert data into a unified experience."
              />
            </EuiText>
            <EuiSpacer size="l" />
          </>
        ) : null}
        <EuiFlexGroup
          direction={isVerticalLayout ? 'column' : 'row'}
          gutterSize={isVerticalLayout ? 'l' : 'm'}
        >
          <EuiFlexItem>
            <EuiCard
              layout="horizontal"
              display="plain"
              titleElement="h3"
              titleSize="xs"
              hasBorder={true}
              title={i18n.translate('xpack.alertingV2.ruleCreateOptionsPanel.createEsqlRuleTitle', {
                defaultMessage: 'Create ES|QL rule',
              })}
              description={i18n.translate(
                'xpack.alertingV2.ruleCreateOptionsPanel.createWithEsqlDescription',
                {
                  defaultMessage:
                    'Create as an ES|QL query with live preview. YAML editor available.',
                }
              )}
              onClick={onCreateEsqlRule}
              icon={<EuiIcon type="productDiscover" color="text" size="l" aria-hidden={true} />}
              data-test-subj="createEsqlRuleCard"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              layout="horizontal"
              display="plain"
              titleElement="h3"
              titleSize="xs"
              hasBorder={true}
              title={i18n.translate(
                'xpack.alertingV2.ruleCreateOptionsPanel.createWithAiAgentTitle',
                {
                  defaultMessage: 'Create with AI Agent',
                }
              )}
              description={i18n.translate(
                'xpack.alertingV2.ruleCreateOptionsPanel.createWithAiAgentDescription',
                { defaultMessage: 'Set up an Alerting rule with the help of the AI Agent.' }
              )}
              onClick={onCreateWithAgent}
              icon={<EuiIcon type="productAgent" color="text" size="l" aria-hidden={true} />}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem>
            <EuiHorizontalRule margin="none" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.alertingV2.ruleCreateOptionsPanel.orDividerLabel"
                defaultMessage="or"
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiHorizontalRule margin="none" />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.alertingV2.ruleCreateOptionsPanel.ruleBuilderSectionTitle"
              defaultMessage="Start from a rule builder"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem css={{ width: '100%' }}>
            <EuiCard
              layout="horizontal"
              display="plain"
              titleElement="h3"
              titleSize="xs"
              hasBorder={true}
              title={i18n.translate('xpack.alertingV2.ruleCreateOptionsPanel.thresholdAlertTitle', {
                defaultMessage: 'Threshold Alert',
              })}
              description={i18n.translate(
                'xpack.alertingV2.ruleCreateOptionsPanel.thresholdAlertDescription',
                {
                  defaultMessage:
                    'Monitor one or more metrics and alert when they cross a threshold. Multi-condition support with custom aggregations.',
                }
              )}
              onClick={onCreateThresholdAlert}
              icon={<EuiIcon type="chartThreshold" color="text" size="l" aria-hidden={true} />}
              css={{
                width: isVerticalLayout ? '100%' : '50%',
                margin: isVerticalLayout ? 0 : '0 auto',
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
