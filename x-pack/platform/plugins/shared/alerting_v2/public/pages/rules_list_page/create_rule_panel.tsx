/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { paths } from '../../constants';

export const CreateRulePanel: React.FC = () => {
  const basePath = useService(CoreStart('http')).basePath;
  const { euiTheme } = useEuiTheme();

  return (
    <EuiEmptyPrompt
      css={{
        maxInlineSize: '75% !important',
        textAlign: 'center',
        margin: '0 auto',
        '.euiEmptyPrompt__main': { maxInlineSize: '100% !important', padding: euiTheme.size.xxxl },
        '.euiEmptyPrompt__content': { maxInlineSize: '100% !important' },
        '.euiEmptyPrompt__actions': { maxInlineSize: '100% !important' },
        '.euiEmptyPrompt__footer': { maxInlineSize: '100% !important' },
      }}
      title={
        <h2>
          <FormattedMessage
            id="xpack.alertingV2.createRulePanel.welcomeTitle"
            defaultMessage="Welcome to the new Alerting experience"
          />
        </h2>
      }
      body={
        <EuiText size="s" color="subdued" textAlign="center">
          <FormattedMessage
            id="xpack.alertingV2.createRulePanel.welcomeDescription"
            defaultMessage="Powerful ES|QL-driven rules and support for external alerts, it delivers consistent, high-quality alert data into a unified experience."
          />
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
                title={i18n.translate('xpack.alertingV2.createRulePanel.createWithEsqlTitle', {
                  defaultMessage: 'Create with ES|QL',
                })}
                description={i18n.translate(
                  'xpack.alertingV2.createRulePanel.createWithEsqlDescription',
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
                  label: i18n.translate('xpack.alertingV2.createRulePanel.comingSoonLabel', {
                    defaultMessage: 'Coming soon',
                  }),
                  color: 'hollow',
                }}
                layout="horizontal"
                titleElement="h3"
                titleSize="xs"
                title={i18n.translate('xpack.alertingV2.createRulePanel.createWithAiAgentTitle', {
                  defaultMessage: 'Create with AI Agent',
                })}
                description={i18n.translate(
                  'xpack.alertingV2.createRulePanel.createWithAiAgentDescription',
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
          <EuiFlexGroup alignItems="center" gutterSize="m" css={{ width: '100%' }}>
            <EuiFlexItem>
              <EuiHorizontalRule margin="none" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.alertingV2.createRulePanel.orDividerLabel"
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
            <h2>
              <FormattedMessage
                id="xpack.alertingV2.createRulePanel.ruleBuilderSectionTitle"
                defaultMessage="Start from a rule builder"
              />
            </h2>
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
                title={i18n.translate('xpack.alertingV2.createRulePanel.thresholdAlertTitle', {
                  defaultMessage: 'Threshold Alert',
                })}
                description={i18n.translate(
                  'xpack.alertingV2.createRulePanel.thresholdAlertDescription',
                  {
                    defaultMessage:
                      'Monitor one or more metrics and alert when they cross a threshold. Multi-condition support with custom aggregations.',
                  }
                )}
                href={basePath.prepend(paths.ruleCreate)}
                icon={<EuiIcon type="chartThreshold" color="text" size="l" aria-hidden={true} />}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      }
      footer={
        <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="m">
          <EuiText size="s" color="subdued" textAlign="center">
            <p>
              <FormattedMessage
                id="xpack.alertingV2.createRulePanel.learnMoreDescription"
                defaultMessage="Want to learn more?"
              />
            </p>
          </EuiText>
          <EuiLink
            href="https://www.elastic.co/guide/en/elasticsearch/reference/current/alerting-rule-types.html"
            target="_blank"
            external
            data-test-subj="createRulePanelDocumentationLink"
            aria-label={i18n.translate(
              'xpack.alertingV2.createRulePanel.documentationLinkAriaLabel',
              { defaultMessage: 'Read documentation' }
            )}
          >
            <FormattedMessage
              id="xpack.alertingV2.createRulePanel.documentationLinkText"
              defaultMessage="Read documentation"
            />
          </EuiLink>
        </EuiFlexGroup>
      }
    />
  );
};
