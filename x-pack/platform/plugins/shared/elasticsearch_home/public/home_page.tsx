/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPageTemplate,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { TrialUsageBadge } from '@kbn/shared-components';
import { i18n } from '@kbn/i18n';
import { AddDataSection } from './components/add_data_section';
import { ChatWithYourDataSection } from './components/chat_with_data_section';
import { ConnectionDetails } from './components/connection_details';
import { HomePageBanner } from './components/home_page_banner';
import { getDataCard, getSecondaryCards } from './components/home_page_stat_cards';
import { HomePageStatPanel } from './components/home_page_stat_panel';
import { useHomeConfig, useHomeServices, useTelemetryId } from './context';
import { useAuthenticatedUser } from './hooks/use_authenticated_user';
import { useDeploymentStats } from './hooks/use_deployment_stats';

export const HomePage = () => {
  const { cloud, application, chrome } = useHomeServices();
  const { docsLink } = useHomeConfig();
  const getTelemetryId = useTelemetryId();
  const { user } = useAuthenticatedUser();
  const { stats, isLoading } = useDeploymentStats();
  const hasData = stats.indicesCount !== 0 || (stats.vectorCount ?? 0) > 0;

  const username = user?.full_name || user?.email;

  const statCardDeps = { application, chrome, stats, isLoading, getTelemetryId };
  const dataCard = getDataCard(statCardDeps);
  const secondaryCards = getSecondaryCards(statCardDeps);

  return (
    <EuiPageTemplate restrictWidth panelled={false} grow={false}>
      <EuiPageTemplate.Section paddingSize="xl" grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" wrap>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              responsive={false}
              wrap
              alignItems="center"
              gutterSize="s"
              data-test-subj="elasticsearchHomeHeaderLeftsideGroup"
            >
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h1>
                    {username
                      ? i18n.translate('xpack.elasticsearchHome.home.welcome.title', {
                          defaultMessage: 'Welcome, {username}',
                          values: { username },
                        })
                      : i18n.translate('xpack.elasticsearchHome.home.welcome.defaultTitle', {
                          defaultMessage: 'Welcome',
                        })}
                  </h1>
                </EuiTitle>
              </EuiFlexItem>
              {cloud?.isInTrial() && (
                <EuiFlexItem grow={false}>
                  <TrialUsageBadge cloud={cloud} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ConnectionDetails />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />
        <EuiHorizontalRule margin="none" />

        <EuiFlexGroup gutterSize="l" direction="column">
          <EuiFlexItem>
            <HomePageBanner hasData={hasData} isLoading={isLoading} />
          </EuiFlexItem>

          <EuiFlexItem>
            <HomePageStatPanel {...dataCard} newIndex={stats.newIndex} />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFlexGroup gutterSize="l">
              {secondaryCards.map((card) => (
                <EuiFlexItem key={card.testSubj}>
                  <HomePageStatPanel {...card} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiSpacer size="s" />

          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xl">
              <EuiFlexItem>
                <AddDataSection />
              </EuiFlexItem>
              <EuiFlexItem>
                <ChatWithYourDataSection />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="l" />
        <EuiLink
          href={docsLink.href}
          target="_blank"
          external
          data-test-subj="elasticsearchHomeDocumentationLink"
          data-telemetry-id={getTelemetryId('documentationLink')}
        >
          {docsLink.label}
        </EuiLink>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
