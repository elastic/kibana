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
import { CoreStart, useService } from '@kbn/core-di-browser';
import { paths } from '../../constants';

export const RuleCreateOptionsPanel: React.FC = () => {
  const basePath = useService(CoreStart('http')).basePath;
  const { euiTheme } = useEuiTheme();

  return (
    <EuiSplitPanel.Outer
      hasBorder
      hasShadow={false}
      grow={false}
      css={{ maxWidth: euiTheme.breakpoint.l, margin: '0 auto', textAlign: 'center' }}
    >
      <EuiSplitPanel.Inner paddingSize="xl" css={{ padding: euiTheme.size.xxxl }}>
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
        <EuiFlexGroup>
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
              href={basePath.prepend(paths.ruleCreate)}
              icon={<EuiIcon type="productDiscover" color="text" size="l" aria-hidden={true} />}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              betaBadgeProps={{
                label: i18n.translate('xpack.alertingV2.ruleCreateOptionsPanel.comingSoonLabel', {
                  defaultMessage: 'Coming soon',
                }),
                color: 'hollow',
                size: 'm',
              }}
              layout="horizontal"
              titleElement="h3"
              titleSize="xs"
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
          {/* TODO: Add the other rule builders here */}
          <EuiFlexItem css={{ width: '100%' }}>
            <EuiCard
              betaBadgeProps={{
                label: i18n.translate('xpack.alertingV2.ruleCreateOptionsPanel.comingSoonLabel', {
                  defaultMessage: 'Coming soon',
                }),
                color: 'hollow',
                size: 'm',
              }}
              layout="horizontal"
              titleElement="h3"
              titleSize="xs"
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
              icon={<EuiIcon type="chartThreshold" color="text" size="l" aria-hidden={true} />}
              aria-disabled={true}
              display="subdued"
              css={{
                cursor: 'default',
                pointerEvents: 'none',
                width: '50%',
                margin: '0 auto',
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
