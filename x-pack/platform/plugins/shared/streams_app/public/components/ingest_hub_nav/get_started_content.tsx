/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const accordionCss = css`
  .euiAccordion__button {
    width: 100%;
    padding-block: 12px;
  }
  .euiAccordion__triggerWrapper {
    border-bottom: none;
  }
`;

const cardCss = (euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => css`
  cursor: default;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 !important;
  margin: 0;
  border-radius: ${euiTheme.border.radius.medium};
  box-shadow: ${euiTheme.shadows.s};
`;

const cardHeaderCss = (euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => css`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: 100px;
  padding: 24px;
  background: ${euiTheme.colors.backgroundBaseSubdued};
`;

const cardBodyCss = (euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => css`
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  text-align: center;
  background: ${euiTheme.colors.backgroundBasePlain};
  padding: 24px;
  box-sizing: border-box;
`;

const sectionIconCss = (euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => css`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${euiTheme.colors.backgroundBaseSubdued};
  flex-shrink: 0;
`;

interface SectionHeaderProps {
  iconType: string;
  title: string;
  description: string;
  badge?: React.ReactNode;
}

const SectionHeader = ({ iconType, title, description, badge }: SectionHeaderProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      responsive={false}
      wrap={false}
      css={css`
        gap: 16px;
      `}
    >
      <EuiFlexItem>
        <EuiTitle size="s">
          <h3
            css={css`
              display: flex;
              align-items: center;
              gap: 8px;
            `}
          >
            <span css={sectionIconCss(euiTheme)}>
              <EuiIcon type={iconType} size="m" />
            </span>
            {title}
          </h3>
        </EuiTitle>
        <EuiText size="s" color="subdued" css={css`margin-top: 4px;`}>
          <p>{description}</p>
        </EuiText>
      </EuiFlexItem>
      {badge && <EuiFlexItem grow={false}>{badge}</EuiFlexItem>}
    </EuiFlexGroup>
  );
};

interface CardProps {
  iconType: string;
  title: string;
  description: string;
}

const Card = ({ iconType, title, description }: CardProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel element="div" hasBorder paddingSize="none" css={cardCss(euiTheme)}>
      <div css={cardHeaderCss(euiTheme)}>
        <EuiIcon type={iconType} size="xxl" color="subdued" />
      </div>
      <div css={cardBodyCss(euiTheme)}>
        <EuiTitle size="xs">
          <h4
            css={css`
              text-align: center;
              margin-block: 0;
            `}
          >
            {title}
          </h4>
        </EuiTitle>
        <EuiText
          size="s"
          color="subdued"
          css={css`
            margin-top: ${euiTheme.size.s};
            text-align: center;
            max-width: 100%;
          `}
        >
          <p css={css`text-align: center; margin-bottom: 0;`}>{description}</p>
        </EuiText>
      </div>
    </EuiPanel>
  );
};

const RequiresDataBadge = () => (
  <EuiBadge color="warning">
    {i18n.translate('xpack.streams.getStartedContent.requiresData', {
      defaultMessage: 'Requires data',
    })}
  </EuiBadge>
);

export const GetStartedContent = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        flex: 1;
        max-width: 1440px;
        margin: 0 auto;
        width: 100%;
      `}
    >
      {/* Page header */}
      <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="logoObservability" size="xxl" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>
              {i18n.translate('xpack.streams.getStartedContent.title', {
                defaultMessage: 'Get started with Elastic Observability',
              })}
            </h1>
          </EuiTitle>
          <EuiText size="s" color="subdued" css={css`margin-top: ${euiTheme.size.s};`}>
            <p>
              {i18n.translate('xpack.streams.getStartedContent.subtitle', {
                defaultMessage:
                  'Your starting point to ingest data, create alerts, manage SLOs, explore Streams, and get the most out of your observability stack',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="l" />

      {/* Step 1: Add your data */}
      <EuiAccordion
        id="get-started-add-data"
        initialIsOpen
        arrowDisplay="left"
        borders="none"
        buttonElement="div"
        buttonProps={{ paddingSize: 's' as const }}
        paddingSize="s"
        css={accordionCss}
        buttonContent={
          <SectionHeader
            iconType="plusInCircle"
            title={i18n.translate('xpack.streams.getStartedContent.addData.title', {
              defaultMessage: 'Add your data',
            })}
            description={i18n.translate('xpack.streams.getStartedContent.addData.description', {
              defaultMessage:
                'Connect your data sources or migrate from another platform to start monitoring your infrastructure.',
            })}
          />
        }
      >
        <div css={css`padding-top: 16px; padding-bottom: 16px;`}>
          <EuiFlexGroup gutterSize="l" alignItems="flex-start">
            <EuiFlexItem>
              <Card
                iconType="indexOpen"
                title={i18n.translate('xpack.streams.getStartedContent.integrations.title', {
                  defaultMessage: 'Recommended integrations',
                })}
                description={i18n.translate(
                  'xpack.streams.getStartedContent.integrations.description',
                  { defaultMessage: 'Browse integrations for logs, metrics, and traces.' }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <Card
                iconType="tranformApp"
                title={i18n.translate('xpack.streams.getStartedContent.platformMigration.title', {
                  defaultMessage: 'Platform migration',
                })}
                description={i18n.translate(
                  'xpack.streams.getStartedContent.platformMigration.description',
                  { defaultMessage: 'Migrate from Splunk, Datadog, or others.' }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <Card
                iconType="compute"
                title={i18n.translate('xpack.streams.getStartedContent.apiConnection.title', {
                  defaultMessage: 'API connection',
                })}
                description={i18n.translate(
                  'xpack.streams.getStartedContent.apiConnection.description',
                  { defaultMessage: 'Send data via REST API or OpenTelemetry.' }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiAccordion>

      <div css={css`height: 40px;`} />

      {/* Step 2: Manage integrations */}
      <EuiAccordion
        id="get-started-manage-integrations"
        initialIsOpen={false}
        arrowDisplay="left"
        borders="none"
        buttonElement="div"
        buttonProps={{ paddingSize: 's' as const }}
        paddingSize="s"
        css={accordionCss}
        buttonContent={
          <SectionHeader
            iconType="managementApp"
            title={i18n.translate('xpack.streams.getStartedContent.manageIntegrations.title', {
              defaultMessage: 'Manage your installed integrations',
            })}
            description={i18n.translate(
              'xpack.streams.getStartedContent.manageIntegrations.description',
              {
                defaultMessage:
                  'View, upgrade, and manage the integrations you installed from the Integrations hub.',
              }
            )}
            badge={<RequiresDataBadge />}
          />
        }
      >
        <EuiPanel
          color="subdued"
          paddingSize="l"
          css={css`border-radius: 8px;`}
        >
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem>
              <EuiText size="s">
                <p>
                  {i18n.translate('xpack.streams.getStartedContent.manageIntegrations.body', {
                    defaultMessage:
                      'The Integrations hub gives you a single place to view your installed integrations, upgrade to newer versions, attach agent policies, and manage dashboards and rules.',
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton disabled>
                {i18n.translate('xpack.streams.getStartedContent.manageIntegrations.action', {
                  defaultMessage: 'Open Integrations',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiAccordion>

      <div css={css`height: 40px;`} />

      {/* Step 3: Streams */}
      <EuiAccordion
        id="get-started-streams"
        initialIsOpen={false}
        arrowDisplay="left"
        borders="none"
        buttonElement="div"
        buttonProps={{ paddingSize: 's' as const }}
        paddingSize="s"
        css={accordionCss}
        buttonContent={
          <SectionHeader
            iconType="devToolsApp"
            title={i18n.translate('xpack.streams.getStartedContent.streams.title', {
              defaultMessage: 'Turn raw data into structured with Streams',
            })}
            description={i18n.translate('xpack.streams.getStartedContent.streams.description', {
              defaultMessage:
                'Use Streams to route, transform, and organize your incoming data into structured formats for easier querying and analysis.',
            })}
            badge={<RequiresDataBadge />}
          />
        }
      >
        <EuiPanel color="subdued" paddingSize="l" css={css`border-radius: 8px;`}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem>
              <EuiText size="s">
                <p>
                  {i18n.translate('xpack.streams.getStartedContent.streams.body', {
                    defaultMessage:
                      "Streams provides a centralized UI that streamlines common tasks like rerouting data, extracting fields, or setting data retention, so you don't need to navigate to multiple applications or manually configure underlying Elasticsearch components.",
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton disabled>
                {i18n.translate('xpack.streams.getStartedContent.streams.action', {
                  defaultMessage: 'Open Streams',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiAccordion>

      <div css={css`height: 40px;`} />

      {/* Step 4: Dashboards */}
      <EuiAccordion
        id="get-started-dashboards"
        initialIsOpen={false}
        arrowDisplay="left"
        borders="none"
        buttonElement="div"
        buttonProps={{ paddingSize: 's' as const }}
        paddingSize="s"
        css={accordionCss}
        buttonContent={
          <SectionHeader
            iconType="dashboardApp"
            title={i18n.translate('xpack.streams.getStartedContent.dashboards.title', {
              defaultMessage: 'Analyze your data using Dashboards',
            })}
            description={i18n.translate('xpack.streams.getStartedContent.dashboards.description', {
              defaultMessage:
                'Create and customize dashboards to visualize your data, track key metrics, and gain insights across your infrastructure and applications.',
            })}
            badge={<RequiresDataBadge />}
          />
        }
      >
        <EuiPanel color="subdued" paddingSize="l" css={css`border-radius: 8px;`}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem>
              <EuiText size="s">
                <p>
                  {i18n.translate('xpack.streams.getStartedContent.dashboards.body', {
                    defaultMessage:
                      'Dashboards let you combine visualizations, saved searches, and other panels to create a unified view of your observability data.',
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton disabled>
                {i18n.translate('xpack.streams.getStartedContent.dashboards.action', {
                  defaultMessage: 'Open Dashboards',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiAccordion>

      <div css={css`height: 40px;`} />

      {/* Step 5: Alerts */}
      <EuiAccordion
        id="get-started-alerts"
        initialIsOpen={false}
        arrowDisplay="left"
        borders="none"
        buttonElement="div"
        buttonProps={{ paddingSize: 's' as const }}
        paddingSize="s"
        css={accordionCss}
        buttonContent={
          <SectionHeader
            iconType="bell"
            title={i18n.translate('xpack.streams.getStartedContent.alerts.title', {
              defaultMessage: 'Get notified when issues occur with Alerts',
            })}
            description={i18n.translate('xpack.streams.getStartedContent.alerts.description', {
              defaultMessage:
                'Set up alerting rules to automatically detect anomalies, threshold breaches, or other conditions that matter to your team.',
            })}
          />
        }
      >
        <EuiPanel color="subdued" paddingSize="l" css={css`border-radius: 8px;`}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem>
              <EuiText size="s">
                <p>
                  {i18n.translate('xpack.streams.getStartedContent.alerts.body', {
                    defaultMessage:
                      'Create rules that monitor your data and notify your team via email, Slack, PagerDuty, or other channels when something needs attention.',
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton disabled>
                {i18n.translate('xpack.streams.getStartedContent.alerts.action', {
                  defaultMessage: 'Open Alerts',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiAccordion>
    </div>
  );
};
