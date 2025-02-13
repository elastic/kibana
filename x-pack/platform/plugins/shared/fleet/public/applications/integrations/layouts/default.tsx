/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiNotificationBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useLink, useStartServices } from '../../../hooks';
import type { Section } from '../sections';

import { WithHeaderLayout } from '.';

interface Props {
  section?: Section;
  children?: React.ReactNode;
  notificationsBySection?: Partial<Record<Section, number>>;
}

export const DefaultLayout: React.FC<Props> = memo(
  ({ section, children, notificationsBySection }) => {
    const { automaticImport } = useStartServices();
    const { getHref } = useLink();
    const tabs = [
      {
        name: (
          <FormattedMessage
            id="xpack.fleet.appNavigation.integrationsAllLinkText"
            defaultMessage="Browse integrations"
          />
        ),
        section: 'browse' as Section,
        href: getHref('integrations_all'),
      },
      {
        name: (
          <FormattedMessage
            id="xpack.fleet.appNavigation.integrationsInstalledLinkText"
            defaultMessage="Installed integrations"
          />
        ),
        section: 'manage' as Section,
        href: getHref('integrations_installed'),
      },
    ];

    const { CreateIntegrationCardButton } = automaticImport?.components ?? {};

    return (
      <WithHeaderLayout
        leftColumn={
          <EuiFlexGroup direction="column" gutterSize="none" justifyContent="center">
            <EuiText>
              <h1>
                <FormattedMessage
                  id="xpack.fleet.integrationsHeaderTitle"
                  defaultMessage="Integrations"
                />
              </h1>
            </EuiText>

            <EuiSpacer size="s" />

            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <p>
                  <FormattedMessage
                    id="xpack.fleet.epm.pageSubtitle"
                    defaultMessage="Choose an integration to start collecting and analyzing your data."
                  />
                </p>
              </EuiText>
            </EuiFlexItem>

            <EuiSpacer size="s" />
          </EuiFlexGroup>
        }
        rightColumnGrow={false}
        rightColumn={
          CreateIntegrationCardButton ? (
            <EuiFlexItem grow={false}>
              <CreateIntegrationCardButton />
            </EuiFlexItem>
          ) : undefined
        }
        tabs={tabs.map((tab) => {
          const notificationCount = notificationsBySection?.[tab.section];
          return {
            name: tab.name,
            append: notificationCount ? (
              <EuiNotificationBadge className="eui-alignCenter" size="m">
                {notificationCount}
              </EuiNotificationBadge>
            ) : undefined,
            href: tab.href,
            isSelected: section === tab.section,
          };
        })}
      >
        {children}
      </WithHeaderLayout>
    );
  }
);
