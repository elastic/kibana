/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import { FeedbackButton } from '../../feedback_button';
import { RedirectTo } from '../../redirect_to';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { InsightsTab } from './components/insights/tab';

export function SignificantEventsDiscoveryPage() {
  const router = useStreamsAppRouter();

  const {
    features: { significantEventsDiscovery },
  } = useStreamsPrivileges();
  const { euiTheme } = useEuiTheme();

  if (significantEventsDiscovery === undefined) {
    // Waiting to load license
    return <EuiLoadingElastic size="xxl" />;
  }

  if (!significantEventsDiscovery.available || !significantEventsDiscovery.enabled) {
    return <RedirectTo path="/" />;
  }

  return (
    <>
      <StreamsAppPageTemplate.Header
        bottomBorder="extended"
        css={css`
          background: ${euiTheme.colors.backgroundBasePlain};
        `}
        pageTitle={
          <EuiFlexGroup
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
            alignItems="center"
          >
            <EuiFlexItem>
              {i18n.translate('xpack.streams.significantEventsDiscovery.pageHeaderTitle', {
                defaultMessage: 'Significant Events',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <FeedbackButton />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    href={router.link('/_discovery/manage/{tab}', { path: { tab: 'streams' } })}
                    data-test-subj="streamsSignificantEventsManagerButton"
                    color="text"
                    iconType="gear"
                  >
                    {i18n.translate('xpack.streams.significantEventsDiscovery.managerButton', {
                      defaultMessage: 'Manager',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
      <StreamsAppPageTemplate.Body grow>
        <InsightsTab />
      </StreamsAppPageTemplate.Body>
    </>
  );
}
