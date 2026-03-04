/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiNotificationBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useLink } from '../../../hooks';
import type { Section } from '../sections';

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

    return (
      <WithHeaderLayout
        noSpacerInContent={noSpacerInContent}
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
