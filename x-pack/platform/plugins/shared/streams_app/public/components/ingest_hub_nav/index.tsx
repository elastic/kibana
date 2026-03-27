/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSideNav, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export type IngestHubNavId =
  | 'get-started'
  | 'data-sources'
  | 'platform-migration'
  | 'dashboards'
  | 'rules';

interface IngestHubNavProps {
  activeId: IngestHubNavId;
  onNavChange: (id: IngestHubNavId) => void;
}

export const IngestHubNav = ({ activeId, onNavChange }: IngestHubNavProps) => {
  const { euiTheme } = useEuiTheme();

  const sideNavCss = css`
    .euiSideNav__heading {
      font-size: ${euiTheme.size.m};
      font-weight: ${euiTheme.font.weight.bold};
      color: ${euiTheme.colors.textHeading};
      padding-block-end: ${euiTheme.size.s};
    }
    .euiSideNavItemButton__label {
      font-size: ${euiTheme.size.m};
    }
  `;

  return (
    <EuiSideNav
      heading={i18n.translate('xpack.streams.ingestHubNav.heading', {
        defaultMessage: 'Ingest hub',
      })}
      css={sideNavCss}
      items={[
        {
          id: 'root',
          name: '',
          forceOpen: true,
          items: [
            {
              id: 'get-started',
              name: i18n.translate('xpack.streams.ingestHubNav.getStarted', {
                defaultMessage: 'Get started',
              }),
              isSelected: activeId === 'get-started',
              onClick: () => onNavChange('get-started'),
            },
            {
              id: 'data-sources',
              name: i18n.translate('xpack.streams.ingestHubNav.dataSources', {
                defaultMessage: 'Data sources',
              }),
              isSelected: activeId === 'data-sources',
              onClick: () => onNavChange('data-sources'),
            },
            {
              id: 'migration',
              name: i18n.translate('xpack.streams.ingestHubNav.migration', {
                defaultMessage: 'Migration',
              }),
              renderItem: () => (
                <EuiText
                  size="xs"
                  css={css`
                    color: ${euiTheme.colors.textSubdued};
                    font-weight: ${euiTheme.font.weight.semiBold};
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    padding-block: ${euiTheme.size.s};
                    padding-inline: ${euiTheme.size.s};
                  `}
                >
                  <span>
                    {i18n.translate('xpack.streams.ingestHubNav.migration', {
                      defaultMessage: 'Migration',
                    })}
                  </span>
                </EuiText>
              ),
              items: [
                {
                  id: 'platform-migration',
                  name: i18n.translate('xpack.streams.ingestHubNav.platformMigration', {
                    defaultMessage: 'Platform Migration',
                  }),
                  isSelected: activeId === 'platform-migration',
                  onClick: () => onNavChange('platform-migration'),
                },
                {
                  id: 'dashboards',
                  name: i18n.translate('xpack.streams.ingestHubNav.dashboards', {
                    defaultMessage: 'Dashboards',
                  }),
                  isSelected: activeId === 'dashboards',
                  onClick: () => onNavChange('dashboards'),
                },
                {
                  id: 'rules',
                  name: i18n.translate('xpack.streams.ingestHubNav.rules', {
                    defaultMessage: 'Rules & monitors',
                  }),
                  isSelected: activeId === 'rules',
                  onClick: () => onNavChange('rules'),
                },
              ],
            },
          ],
        },
      ]}
    />
  );
};
