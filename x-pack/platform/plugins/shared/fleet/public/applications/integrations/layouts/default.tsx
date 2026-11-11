/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiNotificationBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useLink } from '../../../hooks';
import type { Section } from '../sections';
import { BackLink } from '../sections/epm/components/back_link';
import { appendReturnParams, readReturnParams } from '../sections/epm/components/return_params';

import { WithHeaderLayout } from '.';

interface Props {
  section?: Section;
  children?: React.ReactNode;
  notificationsBySection?: Partial<Record<Section, number>>;
  noSpacerInContent?: boolean;
}

export const DefaultLayout: React.FC<Props> = memo(
  ({ section, children, notificationsBySection, noSpacerInContent }) => {
    const { getHref } = useLink();
    const { search } = useLocation();
    const returnParams = readReturnParams(search);
    const queryParams = useMemo(() => new URLSearchParams(search), [search]);
    const browseHref = appendReturnParams(getHref('integrations_all'), returnParams);
    const installedHref = appendReturnParams(getHref('integrations_installed'), returnParams);
    const tabs = [
      {
        name: (
          <FormattedMessage
            id="xpack.fleet.appNavigation.integrationsAllLinkText"
            defaultMessage="Browse integrations"
          />
        ),
        section: 'browse' as Section,
        href: browseHref,
      },
      {
        name: (
          <FormattedMessage
            id="xpack.fleet.appNavigation.integrationsInstalledLinkText"
            defaultMessage="Installed integrations"
          />
        ),
        section: 'manage' as Section,
        href: installedHref,
      },
    ];

    return (
      <WithHeaderLayout
        noSpacerInContent={noSpacerInContent}
        leftColumn={
          <EuiFlexGroup direction="column" gutterSize="none" justifyContent="center">
            {returnParams ? (
              <EuiFlexItem grow={false}>
                <div>
                  <BackLink
                    queryParams={queryParams}
                    integrationsPath={getHref('integrations_all')}
                  />
                </div>
              </EuiFlexItem>
            ) : null}
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
        rightColumn={undefined}
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
