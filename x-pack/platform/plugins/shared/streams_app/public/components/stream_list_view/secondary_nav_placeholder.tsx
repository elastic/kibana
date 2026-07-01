/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSideNav,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { STREAMS_LIST_TABS, STREAMS_LIST_TAB_LABELS } from './streams_tabs';

/**
 * Placeholder shell for the "Using secondary navigation" view mode. This wires
 * up the layout (left side navigation + content area) so the mode switch is
 * demonstrable; the real secondary-navigation experience is built in a later
 * iteration.
 */
export function SecondaryNavPlaceholder() {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize="none" responsive={false} alignItems="stretch">
      <EuiFlexItem
        grow={false}
        css={css`
          width: 220px;
          border-right: ${euiTheme.border.thin};
          padding: ${euiTheme.size.base};
        `}
      >
        <EuiSideNav
          aria-label={i18n.translate('xpack.streams.secondaryNavPlaceholder.sideNavAriaLabel', {
            defaultMessage: 'Streams secondary navigation',
          })}
          items={[
            {
              id: 'streams',
              name: i18n.translate('xpack.streams.secondaryNavPlaceholder.sideNavTitle', {
                defaultMessage: 'Streams',
              }),
              items: STREAMS_LIST_TABS.map((tab) => ({
                id: tab,
                name: STREAMS_LIST_TAB_LABELS[tab],
                onClick: () => {},
              })),
            },
          ]}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasShadow={false} color="transparent" paddingSize="l">
          <EuiEmptyPrompt
            iconType="layers"
            title={
              <h2>
                {i18n.translate('xpack.streams.secondaryNavPlaceholder.title', {
                  defaultMessage: 'Secondary navigation',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('xpack.streams.secondaryNavPlaceholder.body', {
                  defaultMessage:
                    'This view presents Streams using a left-hand secondary navigation. It is still being built — switch back to "Consolidated page" from the view selector in the header to use the current experience.',
                })}
              </p>
            }
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
